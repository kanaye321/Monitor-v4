import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  PlusIcon,
  SearchIcon,
  FileDownIcon,
  UploadIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  FileTextIcon,
  Ellipsis
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";


// IAM Account type - matches database schema
interface IAMAccount {
  id: number;
  requestor: string;
  knoxId: string;
  permission: string;
  durationStartDate: string | null;
  durationEndDate: string | null;
  cloudPlatform: string;
  projectAccounts: string | null;
  approvalId: string | null;
  remarks?: string | null;
  status: 'active' | 'expired' | 'extended' | 'access_removed';
  createdAt: string;
  updatedAt: string;
}

const cloudPlatforms = ["AWS", "Azure", "Google Cloud", "Oracle Cloud"];
const statusTypes = ["active", "expired", "extended", "access_removed"];

export default function IAMAccounts() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [projectAccountFilter, setProjectAccountFilter] = useState("all");
  const [accountToEdit, setAccountToEdit] = useState<IAMAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<IAMAccount | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<Partial<IAMAccount>>({
    requestor: "",
    knoxId: "",
    permission: "",
    durationStartDate: "",
    durationEndDate: "",
    cloudPlatform: "",
    projectAccounts: "",
    approvalId: "",
    remarks: "",
    status: 'active'
  });

  // Fetch IAM accounts from API
  const { data: iamAccounts = [], isLoading, error } = useQuery({
    queryKey: ['/api/iam-accounts'],
    queryFn: async () => {
      console.log('Fetching IAM accounts from API...');
      try {
        const response = await fetch('/api/iam-accounts', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`Failed to fetch IAM accounts: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Received IAM accounts data:', data);
        console.log('Number of accounts:', data?.length || 0);

        // Ensure we return an array
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching IAM accounts:', err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 0 // Always refetch to ensure fresh data
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<IAMAccount>) => {
      const response = await fetch('/api/iam-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create IAM account: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IAMAccount> }) => {
      const response = await fetch(`/api/iam-accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update IAM account: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/iam-accounts/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete IAM account: ${errorText}`);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });
    }
  });

  // Get unique values from actual data for filters
  const uniquePlatforms = [...new Set(iamAccounts.map(account => account.cloudPlatform).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(iamAccounts.map(account => account.status).filter(Boolean))].sort();
  const uniqueProjectAccounts = [...new Set(iamAccounts.map(account => account.projectAccounts).filter(Boolean))].sort();

  const filteredAccounts = iamAccounts.filter(account => {
    const matchesSearch = !searchTerm || 
      account.requestor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.knoxId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.approvalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.cloudPlatform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.projectAccounts?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || account.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || account.cloudPlatform === platformFilter;
    const matchesProjectAccount = projectAccountFilter === "all" || account.projectAccounts === projectAccountFilter;

    return matchesSearch && matchesStatus && matchesPlatform && matchesProjectAccount;
  });

  // Pagination logic
  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages.filter((page, index, self) => {
      // Remove duplicates and consecutive ellipses
      if (page === '...') {
        return index === 0 || self[index - 1] !== '...';
      }
      return self.indexOf(page) === index;
    });
  };

  // Debug logging
  console.log('Raw IAM accounts data:', iamAccounts);
  console.log('Filtered IAM accounts:', filteredAccounts);
  console.log('Current filters:', { searchTerm, statusFilter, platformFilter, projectAccountFilter });
  console.log('Unique platforms:', uniquePlatforms);
  console.log('Unique statuses:', uniqueStatuses);
  console.log('Unique project accounts:', uniqueProjectAccounts);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'extended':
        return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white"><RotateCcw className="w-3 h-3 mr-1" />Extended</Badge>;
      case 'access_removed':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><XCircle className="w-3 h-3 mr-1" />Access Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalIdDisplay = (approvalId: string, status: string) => {
    if (status === 'expired') {
      return (
        <span className="font-bold underline text-red-600">
          {approvalId}
        </span>
      );
    }
    return approvalId;
  };

  const getDurationDisplay = (account: IAMAccount) => {
    if (account.status === 'extended') {
      return <span className="text-gray-400 italic">Extended (dates removed)</span>;
    }
    if (account.status === 'access_removed') {
      return (
        <div>
          <div className="text-gray-400 line-through">Start: {account.durationStartDate || 'N/A'}</div>
          <div>End: {account.durationEndDate || 'N/A'}</div>
        </div>
      );
    }
    return (
      <div>
        <div>Start: {account.durationStartDate || 'N/A'}</div>
        <div>End: {account.durationEndDate || 'N/A'}</div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requestor || !formData.knoxId || !formData.permission || !formData.cloudPlatform) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Requestor, Knox ID, Permission, and Cloud Platform",
        variant: "destructive"
      });
      return;
    }

    try {
      if (accountToEdit) {
        await updateMutation.mutateAsync({ id: accountToEdit.id, data: formData });
        toast({
          title: "Account Updated",
          description: "IAM Account has been updated successfully"
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: "Account Created",
          description: "IAM Account has been created successfully"
        });
      }

      setIsAddDialogOpen(false);
      setAccountToEdit(null);
      resetForm();
    } catch (error) {
      console.error('Error saving IAM account:', error);
      toast({
        title: "Error",
        description: "Failed to save IAM account. Please check your data and try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      requestor: "",
      knoxId: "",
      permission: "",
      durationStartDate: "",
      durationEndDate: "",
      cloudPlatform: "",
      projectAccounts: "",
      approvalId: "",
      remarks: "",
      status: 'active'
    });
  };

  const handleEdit = (account: IAMAccount) => {
    setAccountToEdit(account);
    setFormData(account);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async () => {
    if (accountToDelete) {
      try {
        await deleteMutation.mutateAsync(accountToDelete.id);
        toast({
          title: "Account Deleted",
          description: "IAM Account has been deleted successfully"
        });
        setAccountToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete IAM account",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no IAM accounts to export.",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = [
      "Requestor",
      "Knox ID", 
      "Permission/IAM/SCOP",
      "Duration Start Date",
      "Duration End Date",
      "Cloud Platform",
      "Project Accounts",
      "Approval ID",
      "Remarks",
      "Status"
    ];

    const csvData = filteredAccounts.map(account => [
      account.requestor || '',
      account.knoxId || '',
      account.permission || '',
      account.durationStartDate || '',
      account.durationEndDate || '',
      account.cloudPlatform || '',
      account.projectAccounts || '',
      account.approvalId || '',
      account.remarks || '',
      account.status || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `iam-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "IAM accounts data has been exported to CSV."
    });
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        requestor: "John Doe",
        knoxId: "KNOX001",
        permission: "IAM:ReadOnly",
        durationStartDate: "2024-01-15",
        durationEndDate: "2024-07-15",
        cloudPlatform: "AWS",
        projectAccounts: "dev-account-001",
        approvalId: "APV-2024-001",
        remarks: "Development access for Q1 project",
        status: "active"
      },
      {
        requestor: "Jane Smith",
        knoxId: "KNOX002",
        permission: "IAM:FullAccess",
        durationStartDate: "2024-02-01",
        durationEndDate: "2024-08-01",
        cloudPlatform: "Azure",
        projectAccounts: "prod-account-002",
        approvalId: "APV-2024-002",
        remarks: "Production environment access",
        status: "active"
      }
    ];

    const csvContent = [
      "requestor,knoxId,permission,durationStartDate,durationEndDate,cloudPlatform,projectAccounts,approvalId,remarks,status",
      ...templateData.map(row => 
        `"${row.requestor}","${row.knoxId}","${row.permission}",${row.durationStartDate},${row.durationEndDate},"${row.cloudPlatform}","${row.projectAccounts}","${row.approvalId}","${row.remarks}",${row.status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'iam-accounts-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "IAM accounts import template has been downloaded successfully."
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const parseCSVData = (csvContent: string) => {
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const accounts = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.replace(/^"(.*)"$/, '$1').trim());

      const account: any = { status: 'active' };
      headers.forEach((header, index) => {
        const value = values[index] || '';

        switch (header) {
          case 'requestor':
            account.requestor = value;
            break;
          case 'knoxid':
          case 'knox_id':
          case 'knox id':
            account.knoxId = value;
            break;
          case 'permission':
          case 'permission/iam/scop':
            account.permission = value;
            break;
          case 'durationstartdate':
          case 'duration_start_date':
          case 'duration start date':
            account.durationStartDate = value;
            break;
          case 'durationenddate':
          case 'duration_end_date':
          case 'duration end date':
            account.durationEndDate = value;
            break;
          case 'cloudplatform':
          case 'cloud_platform':
          case 'cloud platform':
            account.cloudPlatform = value;
            break;
          case 'projectaccounts':
          case 'project_accounts':
          case 'project accounts':
            account.projectAccounts = value;
            break;
          case 'approvalid':
          case 'approval_id':
          case 'approval id':
            account.approvalId = value;
            break;
          case 'remarks':
          case 'notes':
            account.remarks = value;
            break;
          case 'status':
            account.status = value || 'active';
            break;
        }
      });

      if (account.requestor && account.knoxId && account.permission && account.cloudPlatform) {
        accounts.push(account);
      }
    }

    return accounts;
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive"
      });
      return;
    }

    setImportStatus('uploading');
    setImportProgress(25);

    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(importFile);
      });

      setImportProgress(50);

      const parsedAccounts = parseCSVData(fileContent);

      setImportProgress(75);

      // Send to API for import
      const response = await fetch('/api/iam-accounts/import', {
        method: 'POST',
        body: JSON.stringify({ accounts: parsedAccounts }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${errorText}`);
      }

      const importResult = await response.json();

      setImportProgress(100);
      setImportStatus('success');

      toast({
        title: "Import successful",
        description: `Successfully imported ${importResult.successful || parsedAccounts.length} IAM accounts.`
      });

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/iam-accounts'] });

      // Reset import state
      setImportFile(null);
      setIsImportDialogOpen(false);
      setImportStatus('idle');
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      setImportStatus('error');
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">IAM Accounts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage Identity and Access Management accounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add IAM Account
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileDownIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by requestor, Knox ID, approval ID, platform, or project account..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {uniquePlatforms.map(platform => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectAccountFilter} onValueChange={setProjectAccountFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Project Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Project Accounts</SelectItem>
              {uniqueProjectAccounts.map(projectAccount => (
                <SelectItem key={projectAccount} value={projectAccount}>
                  {projectAccount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => {
            setStatusFilter("all");
            setPlatformFilter("all");
            setProjectAccountFilter("all");
            setSearchTerm("");
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
          <CardDescription>Status indicators and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span><strong>Active/Complete:</strong> Current valid access</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span><strong>Expired:</strong> Missing end date or past due</span>
            </div>
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-blue-500" />
              <span><strong>Extended:</strong> Both dates removed</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-orange-500" />
              <span><strong>Access Removed:</strong> Start date removed</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20">
            <p className="text-sm">
              <strong>Note:</strong> Users with expired approvals will have their <strong className="underline">Approval ID displayed in bold and underlined</strong> for notification purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Knox ID</TableHead>
                  <TableHead>Permission/IAM/SCOP</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cloud Platform</TableHead>
                  <TableHead>Project Accounts</TableHead>
                  <TableHead>Approval ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading IAM accounts...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-red-500">
                      Error loading IAM accounts: {error.message}
                    </TableCell>
                  </TableRow>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {iamAccounts.length === 0 ? 'No IAM accounts found' : 'No accounts match the current filters'}
                      <br />
                      <small className="text-xs text-gray-400">
                        Total accounts in database: {iamAccounts.length}
                      </small>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.requestor}</TableCell>
                      <TableCell>{account.knoxId}</TableCell>
                      <TableCell>{account.permission}</TableCell>
                      <TableCell className="text-sm">
                        {getDurationDisplay(account)}
                      </TableCell>
                      <TableCell>{account.cloudPlatform}</TableCell>
                      <TableCell>{account.projectAccounts}</TableCell>
                      <TableCell>
                        {getApprovalIdDisplay(account.approvalId, account.status)}
                      </TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{account.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <EditIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAccountToDelete(account)}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {generatePageNumbers().map((pageNumber) => (
                    <PaginationItem key={String(pageNumber)}>
                      {pageNumber === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNumber as number);
                          }}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={cn(
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="text-sm text-gray-500">
                {totalItems} total accounts
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{accountToEdit ? 'Edit IAM Account' : 'Add New IAM Account'}</DialogTitle>
            <DialogDescription>
              {accountToEdit ? 'Update the IAM account details' : 'Create a new IAM account entry'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Requestor *</label>
                <Input
                  value={formData.requestor || ''}
                  onChange={(e) => setFormData({...formData, requestor: e.target.value})}
                  placeholder="Enter requestor name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Knox ID *</label>
                <Input
                  value={formData.knoxId || ''}
                  onChange={(e) => setFormData({...formData, knoxId: e.target.value})}
                  placeholder="Enter Knox ID"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Permission/IAM/SCOP *</label>
                <Textarea
                  value={formData.permission || ''}
                  onChange={(e) => setFormData({...formData, permission: e.target.value})}
                  placeholder="Enter permission details"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration Start Date</label>
                <Input
                  type="date"
                  value={formData.durationStartDate || ''}
                  onChange={(e) => setFormData({...formData, durationStartDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration End Date</label>
                <Input
                  type="date"
                  value={formData.durationEndDate || ''}
                  onChange={(e) => setFormData({...formData, durationEndDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cloud Platform *</label>
                <Input
                  value={formData.cloudPlatform || ''}
                  onChange={(e) => setFormData({...formData, cloudPlatform: e.target.value})}
                  placeholder="Enter cloud platform (e.g., AWS, Azure)"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Accounts</label>
                <Input
                  value={formData.projectAccounts || ''}
                  onChange={(e) => setFormData({...formData, projectAccounts: e.target.value})}
                  placeholder="Enter project accounts"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Approval ID</label>
                <Input
                  value={formData.approvalId || ''}
                  onChange={(e) => setFormData({...formData, approvalId: e.target.value})}
                  placeholder="Enter approval ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status || 'active'} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTypes.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter any additional remarks"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setAccountToEdit(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {accountToEdit ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import IAM Accounts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple IAM accounts. Download the template for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="p-4 border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <FileTextIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Download the CSV template to ensure proper formatting
                </p>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileDownIcon className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select CSV File</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {importFile && (
                <p className="text-sm text-gray-600">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {importStatus === 'uploading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing accounts...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* CSV Format Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Required columns:</strong> requestor, knoxId, permission, cloudPlatform</p>
              <p><strong>Optional columns:</strong> durationStartDate, durationEndDate, projectAccounts, approvalId, remarks, status</p>
              <p><strong>Date format:</strong> YYYY-MM-DD</p>
              <p><strong>Status options:</strong> active, expired, extended, access_removed</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
                setImportStatus('idle');
                setImportProgress(0);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={importStatus === 'uploading'}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportCSV}
              disabled={!importFile || importStatus === 'uploading'}
            >
              {importStatus === 'uploading' ? 'Importing...' : 'Import Accounts'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDelete}
        itemType="IAM account"
        itemName={accountToDelete ? `${accountToDelete.requestor} (${accountToDelete.knoxId})` : ""}
        isLoading={false}
      />
    </div>
  );
}