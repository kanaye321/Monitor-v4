import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UploadIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Progress
} from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CSVITEquipment {
  name?: string;
  category?: string;
  totalQuantity?: string;
  model?: string;
  location?: string;
  dateAcquired?: string;
  knoxId?: string;
  serialNumber?: string;
  dateRelease?: string;
  remarks?: string;
  status?: string;
}

interface ITEquipmentCSVImportProps {
  onImportComplete: () => void;
}

export default function ITEquipmentCSVImport({ onImportComplete }: ITEquipmentCSVImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedEquipment, setParsedEquipment] = useState<CSVITEquipment[] | null>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const parseCSV = (csvContent: string): CSVITEquipment[] => {
    const lines = csvContent.split('\n');

    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse header row
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

    // Parse data rows
    const equipment: CSVITEquipment[] = [];
    let emptyRowsSkipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        emptyRowsSkipped++;
        continue;
      }

      const values = lines[i].split(',').map(value => value.trim().replace(/^"(.*)"$/, '$1'));

      while (values.length < headers.length) {
        values.push('');
      }

      const item: any = {};
      let hasAnyData = false;

      headers.forEach((header, index) => {
        const value = values[index];
        if (!value || value === '' || value === 'N/A') return;

        hasAnyData = true;

        switch (header) {
          case 'name':
            item.name = value;
            break;
          case 'category':
            item.category = value;
            break;
          case 'totalquantity':
          case 'total_quantity':
          case 'total quantity':
          case 'quantity':
            item.totalQuantity = value;
            break;
          case 'model':
            item.model = value;
            break;
          case 'location':
            item.location = value;
            break;
          case 'dateacquired':
          case 'date_acquired':
          case 'date acquired':
            item.dateAcquired = value;
            break;
          case 'knoxid':
          case 'knox_id':
          case 'knox id':
            item.knoxId = value;
            break;
          case 'serialnumber':
          case 'serial_number':
          case 'serial number':
            item.serialNumber = value;
            break;
          case 'daterelease':
          case 'date_release':
          case 'date release':
            item.dateRelease = value;
            break;
          case 'remarks':
          case 'notes':
          case 'description':
            item.remarks = value;
            break;
          case 'status':
            item.status = value;
            break;
          default:
            item[header] = value;
            break;
        }
      });

      if (hasAnyData) {
        equipment.push(item as CSVITEquipment);
      } else {
        emptyRowsSkipped++;
      }
    }

    return equipment;
  };

  const convertCSVToITEquipment = (csvEquipment: CSVITEquipment[]) => {
    return csvEquipment.map((item) => ({
      name: item.name || 'Unnamed Equipment',
      category: item.category || 'General',
      totalQuantity: parseInt(item.totalQuantity || '1'),
      model: item.model || null,
      location: item.location || null,
      dateAcquired: item.dateAcquired || null,
      knoxId: item.knoxId || null,
      serialNumber: item.serialNumber || null,
      dateRelease: item.dateRelease || null,
      remarks: item.remarks || null,
      status: item.status || 'available',
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      setParsedEquipment(null);
      setParseError(null);
      return;
    }

    const file = e.target.files[0];

    const maxSizeInMB = 25;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setParseError(`File size too large. Please use a CSV file smaller than ${maxSizeInMB}MB.`);
      toast({
        title: "File too large",
        description: `Please select a CSV file smaller than ${maxSizeInMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsedEquipment(null);
    setImportSummary(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const equipment = parseCSV(csvContent);
        setParsedEquipment(equipment);
        toast({
          title: "File parsed successfully",
          description: `Found ${equipment.length} equipment items ready for import.`,
        });
      } catch (error) {
        console.error("CSV parse error:", error);
        setParseError((error as Error).message);
        toast({
          title: "Parse failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedEquipment) return;

    try {
      const equipmentToImport = convertCSVToITEquipment(parsedEquipment);
      importMutation.mutate(equipmentToImport);
    } catch (error) {
      toast({
        title: "Import failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (equipment: any[]) => {
      setImportStatus("uploading");
      setImportProgress(25);

      const response = await fetch("/api/it-equipment/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ equipment }),
      });

      setImportProgress(75);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Import failed");
      }

      const data = await response.json();
      setImportProgress(100);
      return data;
    },
    onSuccess: (data) => {
      setImportStatus("success");
      setImportSummary(data);
      queryClient.invalidateQueries({ queryKey: ['/api/it-equipment'] });

      toast({
        title: "Import successful",
        description: `${data.successful} equipment items imported successfully.`,
      });

      setTimeout(() => {
        onImportComplete();
      }, 2000);
    },
    onError: (error) => {
      setImportStatus("error");
      toast({
        title: "Import failed",
        description: (error as Error).message || "Failed to import equipment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setParsedEquipment(null);
    setParseError(null);
    setImportSummary(null);
    setImportProgress(0);
    setImportStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: "Sample Laptop",
        category: "Laptop",
        totalQuantity: "10",
        model: "ThinkPad X1 Carbon",
        location: "Head Office - Room 201",
        dateAcquired: "2023-01-15",
        knoxId: "KNOX001",
        serialNumber: "SN123456789",
        dateRelease: "",
        remarks: "High-performance laptop for development work",
        status: "available",
        assignedTo: "john.doe",
        assignedQuantity: "2",
        assignedDate: "2023-01-20",
        assignmentNotes: "Assigned for development project"
      },
      {
        name: "Sample Desktop",
        category: "Desktop",
        totalQuantity: "5",
        model: "OptiPlex 7090",
        location: "Branch Office - Floor 3",
        dateAcquired: "2023-02-10",
        knoxId: "KNOX002",
        serialNumber: "SN987654321",
        dateRelease: "",
        remarks: "Desktop computer for office productivity",
        status: "available",
        assignedTo: "",
        assignedQuantity: "",
        assignedDate: "",
        assignmentNotes: ""
      }
    ];

    const csvContent = [
      "name,category,totalQuantity,model,location,dateAcquired,knoxId,serialNumber,dateRelease,remarks,status,assignedTo,assignedQuantity,assignedDate,assignmentNotes",
      ...templateData.map(row => 
        `"${row.name}",${row.category},${row.totalQuantity},"${row.model}","${row.location}",${row.dateAcquired},${row.knoxId},${row.serialNumber},${row.dateRelease},"${row.remarks}",${row.status},"${row.assignedTo}",${row.assignedQuantity},${row.assignedDate},"${row.assignmentNotes}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "it_equipment_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Import IT Equipment from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with IT equipment data to bulk import equipment. Maximum file size: 25MB.
          <br />
          <strong>Required columns:</strong> name, category, totalQuantity
          <br />
          <strong>Optional columns:</strong> model, location, dateAcquired, knoxId, serialNumber, dateRelease, remarks, status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {parseError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Parse Error</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {importSummary && (
          <Alert variant={importSummary.failed > 0 ? "destructive" : "default"} className="mb-4">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>Import Summary</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p>Total: {importSummary.total}, Successful: {importSummary.successful}, Failed: {importSummary.failed}</p>
                {importSummary.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc pl-4 text-sm">
                      {importSummary.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importSummary.errors.length > 5 && (
                        <li>... and {importSummary.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* File Selection */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus === "uploading"}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                <FileTextIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm truncate max-w-[250px]">
                  {selectedFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={resetForm}
                  disabled={importStatus === "uploading"}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {importStatus === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing equipment...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Preview Table */}
          {parsedEquipment && parsedEquipment.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Preview ({parsedEquipment.length} items)</h3>
              <div className="border rounded-lg max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date Acquired</TableHead>
                      <TableHead>Knox ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedEquipment.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{item.category || <span className="text-gray-400">General</span>}</TableCell>
                        <TableCell>{item.totalQuantity || <span className="text-gray-400">1</span>}</TableCell>
                        <TableCell>{item.model || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{item.location || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{item.dateAcquired || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{item.knoxId || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{item.status || <span className="text-gray-400">available</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedEquipment.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... and {parsedEquipment.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={importStatus === "uploading"}
            >
              Reset
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importStatus === "uploading" ||
                importStatus === "success" ||
                !parsedEquipment ||
                parsedEquipment.length === 0
              }
            >
              {importStatus === "uploading" ? "Importing..." : `Import ${parsedEquipment?.length || 0} Items`}
            </Button>
          </div>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}