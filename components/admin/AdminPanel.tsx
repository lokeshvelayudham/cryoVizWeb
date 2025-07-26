"use client";
import { useState, useEffect } from "react";
import { Pen, UserPlus, List, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminPanel() {
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDatasetAssignment, setShowDatasetAssignment] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    abbr: "",
    type: "",
    industry: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    status: "Active" as const,
    userEmail: "",
    accessLevel: "user" as const,
    institution: "",
    assignedDatasets: [] as string[],
  });

  const fetchData = async () => {
    const response = await fetch("/api/admin");
    const data = await response.json();
    setInstitutions(data.institutions);
    setUsers(data.users);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, action: "institution" }),
    });
    if (response.ok) {
      setShowInstitutionForm(false);
      await fetchData();
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const institution = institutions.find((inst) => inst.name === formData.institution);
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, institutionId: institution?._id, action: "user" }),
    });
    if (response.ok) {
      setShowUserForm(false);
      await fetchData();
    }
  };

  const handleAssignDatasets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedUser, datasets: formData.assignedDatasets, action: "assign-datasets" }),
    });
    if (response.ok) {
      setShowDatasetAssignment(false);
      await fetchData();
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setShowInstitutionForm(true)}
        >
          <Pen className="mr-2 h-4 w-4" /> New Institution
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setShowUserForm(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" /> New User
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setShowDatasetAssignment(true)}
        >
          <Database className="mr-2 h-4 w-4" /> Assign Datasets
        </Button>
      </div>

      {showInstitutionForm && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>New Institution <button onClick={() => setShowInstitutionForm(false)} className="ml-2 text-red-500">×</button></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitInstitution} className="space-y-4">
              <Input
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={false}
              />
              <Input
                placeholder="Abbr"
                value={formData.abbr}
                onChange={(e) => setFormData({ ...formData, abbr: e.target.value })}
              />
              <Input
                placeholder="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
              <Input
                placeholder="Industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
              <Input
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <Input
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                placeholder="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showUserForm && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>New User <button onClick={() => setShowUserForm(false)} className="ml-2 text-red-500">×</button></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitUser} className="space-y-4">
              <Input
                placeholder="Email address"
                value={formData.userEmail}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              />
              <Select
                value={formData.accessLevel}
                onValueChange={(value) => setFormData({ ...formData, accessLevel: value as "admin" | "user" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Access Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formData.institution}
                onValueChange={(value) => setFormData({ ...formData, institution: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst._id} value={inst.name}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showDatasetAssignment && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Assign Datasets <button onClick={() => setShowDatasetAssignment(false)} className="ml-2 text-red-500">×</button></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssignDatasets} className="space-y-4">
              <Select
                value={selectedUser || ""}
                onValueChange={setSelectedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user.email}>{user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={formData.assignedDatasets}
                onValueChange={(value) => setFormData({ ...formData, assignedDatasets: value as string[] })}
                multiple
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign Datasets" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset} value={dataset}>{dataset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={!selectedUser}>Assign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Institution List</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Abbreviation</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Created At</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((institution) => (
                <tr key={institution._id} className="border-b dark:border-gray-700">
                  <td className="px-2 py-1">{institution.name}</td>
                  <td className="px-2 py-1">{institution.abbr}</td>
                  <td className="px-2 py-1">{institution.status}</td>
                  <td className="px-2 py-1">{new Date(institution.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-2 py-1">Email</th>
                <th className="px-2 py-1">Level</th>
                <th className="px-2 py-1">Logins</th>
                <th className="px-2 py-1">Institution</th>
                <th className="px-2 py-1">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b dark:border-gray-700">
                  <td className="px-2 py-1">{user.email}</td>
                  <td className="px-2 py-1">{user.accessLevel}</td>
                  <td className="px-2 py-1">{user.logins}</td>
                  <td className="px-2 py-1">{institutions.find((inst) => inst._id === user.institutionId)?.name || "N/A"}</td>
                  <td className="px-2 py-1">{user.lastLogin?.toLocaleDateString() || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
