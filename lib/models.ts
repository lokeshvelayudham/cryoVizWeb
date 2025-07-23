import { MongoClient, ObjectId } from "mongodb";
import clientPromise from "./mongodb";

export interface Institution {
  _id?: ObjectId;
  name: string;
  abbr: string;
  type: "Industry" | "Government" | "Academic" | "Others";
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: "Active" | "Inactive";
  createdAt: Date;
}

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  accessLevel: "admin" | "user";
  institutionId: ObjectId;
  logins: number;
  lastLogin?: Date;
  assignedDatasets: string[];
}

export interface Dataset {
  _id?: ObjectId;
  name: string;
  description?: string;
  institutionId: string;
  brightfieldBlobUrl?: string;
  fluorescentBlobUrl?: string;
  alphaBlobUrl?: string;
  liverTiffBlobUrl?: string;
  tumorTiffBlobUrl?: string;
  voxels?: number;
  thickness?: number;
  pixelLengthUM?: number;
  zSkip?: number;
  specimen?: string;
  pi?: string;
  dims3?: { x?: number; y?: number; z?: number };
  dims2?: { x?: number; y?: number; z?: number };
  imageDims?: { x?: number; y?: number; z?: number };
  assignedUsers?: string[];
  createdAt: Date;
}

/**
 * Retrieves all institutions from the database.
 * @returns A promise resolving to an array of Institution objects.
 * @throws Error if the database query fails.
 */
export async function getInstitutions(): Promise<Institution[]> {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<Institution>("institutions").find().toArray();
  } catch (error) {
    throw new Error(`Failed to fetch institutions: ${error}`);
  }
}

/**
 * Retrieves all users from the database.
 * @returns A promise resolving to an array of User objects.
 * @throws Error if the database query fails.
 */
export async function getUsers(): Promise<User[]> {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<User>("users").find().toArray();
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error}`);
  }
}

/**
 * Retrieves all datasets from the database.
 * @returns A promise resolving to an array of Dataset objects.
 * @throws Error if the database query fails.
 */
export async function getDatasets(): Promise<Dataset[]> {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<Dataset>("datasets").find().toArray();
  } catch (error) {
    throw new Error(`Failed to fetch datasets: ${error}`);
  }
}

/**
 * Creates a new institution in the database.
 * @param institution - The institution data to insert.
 * @returns A promise resolving to the MongoDB insert result.
 * @throws Error if the database operation fails.
 */
export async function createInstitution(institution: Omit<Institution, "_id" | "createdAt">) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const data = { ...institution, createdAt: new Date() };
    return await db.collection<Institution>("institutions").insertOne(data);
  } catch (error) {
    throw new Error(`Failed to create institution: ${error}`);
  }
}

/**
 * Updates an existing institution in the database.
 * @param institution - The institution data to update, including the _id.
 * @returns A promise resolving to the MongoDB update result.
 * @throws Error if the database operation fails or _id is missing.
 */
export async function updateInstitution(institution: Institution) {
  try {
    if (!institution._id) {
      throw new Error("Institution _id is required for update");
    }
    const client = await clientPromise;
    const db = client.db();
    const { _id, ...updateData } = institution;
    return await db.collection<Institution>("institutions").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  } catch (error) {
    throw new Error(`Failed to update institution: ${error}`);
  }
}

/**
 * Creates a new user in the database.
 * @param user - The user data to insert.
 * @returns A promise resolving to the MongoDB insert result.
 * @throws Error if the database operation fails or email exists.
 */
export async function createUser(user: Omit<User, "_id" | "logins" | "lastLogin" | "assignedDatasets">) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const existingUser = await db.collection<User>("users").findOne({ email: user.email });
    if (existingUser) {
      throw new Error("Email already exists");
    }
    const data = { ...user, logins: 0, lastLogin: undefined, assignedDatasets: [] };
    return await db.collection<User>("users").insertOne(data);
  } catch (error) {
    throw new Error(`Failed to create user: ${error}`);
  }
}

/**
 * Updates an existing user in the database.
 * @param user - The user data to update, including the _id.
 * @returns A promise resolving to the MongoDB update result.
 * @throws Error if the database operation fails, _id is missing, or email exists for another user.
 */
export async function updateUser(user: User) {
  try {
    if (!user._id) {
      throw new Error("User _id is required for update");
    }
    const client = await clientPromise;
    const db = client.db();
    const existingUser = await db.collection<User>("users").findOne({
      email: user.email,
      _id: { $ne: new ObjectId(user._id) },
    });
    if (existingUser) {
      throw new Error("Email already exists for another user");
    }
    const { _id, logins, lastLogin, assignedDatasets, ...updateData } = user;
    return await db.collection<User>("users").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  } catch (error) {
    throw new Error(`Failed to update user: ${error}`);
  }
}

/**
 * Updates the login count and last login timestamp for a user by their ID.
 * @param id - The ID of the user to update.
 * @returns A promise resolving to the MongoDB update result.
 * @throws Error if the database operation fails or ID is invalid.
 */
export async function updateUserLastLogin(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<User>("users").updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { logins: 1 },
        $set: { lastLogin: new Date(), updatedAt: new Date() },
      }
    );
  } catch (error) {
    throw new Error(`Failed to update user login info: ${error}`);
  }
}

/**
 * Updates the assigned datasets for a user by email.
 * @param email - The email of the user to update.
 * @param datasets - The new array of dataset IDs to assign.
 * @returns A promise resolving to the MongoDB update result.
 * @throws Error if the database operation fails.
 */
export async function updateUserDatasets(email: string, datasets: string[]) {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<User>("users").updateOne(
      { email },
      { $set: { assignedDatasets: datasets } }
    );
  } catch (error) {
    throw new Error(`Failed to update user datasets: ${error}`);
  }
}

/**
 * Creates a new dataset in the database and updates assigned users.
 * @param dataset - The dataset data to insert.
 * @returns A promise resolving to the MongoDB insert result.
 * @throws Error if the database operation fails.
 */
export async function createDataset(dataset: Omit<Dataset, "_id" | "createdAt">) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const data = { ...dataset, createdAt: new Date() };
    const result = await db.collection<Dataset>("datasets").insertOne(data);
    const datasetId = result.insertedId.toString();

    // Update assigned users with the new dataset ID
    if (dataset.assignedUsers && dataset.assignedUsers.length > 0) {
      const updatePromises = dataset.assignedUsers.map((userId) =>
        db.collection<User>("users").updateOne(
          { _id: new ObjectId(userId) },
          { $addToSet: { assignedDatasets: datasetId } }
        )
      );
      await Promise.all(updatePromises);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to create dataset: ${error}`);
  }
}

/**
 * Updates an existing dataset in the database.
 * @param dataset - The dataset data to update, including the _id.
 * @returns A promise resolving to the MongoDB update result.
 * @throws Error if the database operation fails or _id is missing.
 */
export async function updateDataset(dataset: Dataset) {
  try {
    if (!dataset._id) {
      throw new Error("Dataset _id is required for update");
    }
    const client = await clientPromise;
    const db = client.db();
    const { _id, ...updateData } = dataset;
    return await db.collection<Dataset>("datasets").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
  } catch (error) {
    throw new Error(`Failed to update dataset: ${error}`);
  }
}

/**
 * Deletes a dataset from the database by its ID.
 * @param id - The ID of the dataset to delete.
 * @returns A promise resolving to the MongoDB delete result.
 * @throws Error if the database operation fails or ID is invalid.
 */
export async function deleteDataset(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<Dataset>("datasets").deleteOne({
      _id: new ObjectId(id),
    });
  } catch (error) {
    throw new Error(`Failed to delete dataset: ${error}`);
  }
}

/**
 * Deletes an institution from the database by its ID.
 * @param id - The ID of the institution to delete.
 * @returns A promise resolving to the MongoDB delete result.
 * @throws Error if the database operation fails or ID is invalid.
 */
export async function deleteInstitution(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<Institution>("institutions").deleteOne({
      _id: new ObjectId(id),
    });
  } catch (error) {
    throw new Error(`Failed to delete institution: ${error}`);
  }
}

/**
 * Deletes a user from the database by its ID.
 * @param id - The ID of the user to delete.
 * @returns A promise resolving to the MongoDB delete result.
 * @throws Error if the database operation fails or ID is invalid.
 */
export async function deleteUser(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db();
    return await db.collection<User>("users").deleteOne({
      _id: new ObjectId(id),
    });
  } catch (error) {
    throw new Error(`Failed to delete user: ${error}`);
  }
}