import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface NotificationData {
  userId: string;
  type: 'upload' | 'system';
  title: string;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: {
    datasetId?: string;
    uploadId?: string;
    action?: string;
  };
}

/**
 * Create a notification for a user
 * This function can be called from other APIs to create notifications
 */
export async function createNotification(notificationData: NotificationData) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Verify user exists
    const user = await db.collection("users").findOne({ _id: new ObjectId(notificationData.userId) });
    if (!user) {
      throw new Error("User not found");
    }

    // Create notification
    const notification = {
      ...notificationData,
      timestamp: new Date(),
      read: false,
      priority: notificationData.priority || 'medium'
    };

    const result = await db.collection("notifications").insertOne(notification);
    return result.insertedId.toString();
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(userIds: string[], notificationData: Omit<NotificationData, 'userId'>) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Verify users exist
    const users = await db.collection("users").find({
      _id: { $in: userIds.map(id => new ObjectId(id)) }
    }).toArray();

    if (users.length === 0) {
      throw new Error("No valid users found");
    }

    // Create notifications for each user
    const notifications = users.map(user => ({
      ...notificationData,
      userId: user._id.toString(),
      timestamp: new Date(),
      read: false,
      priority: notificationData.priority || 'medium'
    }));

    if (notifications.length > 0) {
      const result = await db.collection("notifications").insertMany(notifications);
      return result.insertedIds;
    }

    return {};
  } catch (error) {
    console.error("Failed to create notifications for users:", error);
    throw error;
  }
}

/**
 * Create upload completion notification (admin only)
 */
export async function createUploadNotification(uploadId: string, datasetName: string, adminUserId: string) {
  return createNotification({
    userId: adminUserId,
    type: 'upload',
    title: 'Dataset Upload Complete',
    message: `Dataset "${datasetName}" has been successfully uploaded and processed.`,
    priority: 'high',
    metadata: {
      uploadId,
      action: 'upload-complete'
    }
  });
}

/**
 * Create dataset assignment notification
 */
export async function createDatasetAssignmentNotification(userId: string, datasetName: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'New Dataset Assignment',
    message: `You have been granted access to dataset "${datasetName}"`,
    priority: 'medium',
    metadata: {
      action: 'dataset-assigned'
    }
  });
}

/**
 * Create access level update notification
 */
export async function createAccessLevelNotification(userId: string, newAccessLevel: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'Access Level Updated',
    message: `Your account access level has been updated to "${newAccessLevel}".`,
    priority: 'low',
    metadata: {
      action: 'access-level-changed'
    }
  });
}
