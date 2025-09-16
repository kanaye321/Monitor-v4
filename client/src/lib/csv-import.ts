import { InsertAsset, InsertComponent, InsertAccessory, AssetStatus, AccessoryStatus } from "@shared/schema";
import { downloadCSV } from "./utils";

// VM types for CSV import
interface VirtualMachine {
  id: number;
  // VM Identification
  vmId: string;
  vmName: string;
  vmStatus: string;
  vmIp: string;
  internetAccess: boolean;
  vmOs: string;
  vmOsVersion: string;
  // Host Details
  hypervisor: string;
  hostname: string;
  hostModel: string;
  hostIp: string;
  hostOs: string;
  rack: string;
  // Usage and tracking
  deployedBy: string;
  user: string;
  department: string;
  startDate: string;
  endDate: string;
  jiraTicket: string;
  remarks: string;
  dateDeleted: string | null;
}

type NewVirtualMachine = Omit<VirtualMachine, "id">;

export type CSVVM = {
  // VM Identification
  vmId: string;
  vmName: string;
  vmStatus?: string;
  vmIp?: string;
  internetAccess?: string;
  vmOs?: string;
  vmOsVersion?: string;
  // Host Details
  hypervisor: string;
  hostname?: string;
  hostModel?: string;
  hostIp?: string;
  hostOs?: string;
  rack?: string;
  // Usage and tracking
  deployedBy?: string;
  user?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  jiraTicket?: string;
  remarks?: string;
};

export interface CSVAsset {
  assetTag?: string;
  name?: string;
  category?: string;
  status?: string;
  condition?: string;
  serialNumber: string;
  model?: string;
  purchaseDate?: string;
  manufacturer?: string;
  purchaseCost?: string;
  location?: string;
  knoxId?: string;
  ipAddress?: string;
  macAddress?: string;
  osType?: string;
  department?: string;
  description?: string;
  warranty?: string;
  supplier?: string;
  [key: string]: any; // Allow for additional custom fields
}

export type CSVComponent = {
  name: string;
  category: string;
  quantity?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

export type CSVAccessory = {
  name: string;
  category: string;
  status?: string;
  quantity?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

/**
 * Parse Excel file as CSV data
 */
export async function parseExcelFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // For now, we'll treat Excel files as CSV by asking users to save as CSV
        // In a real implementation, you'd use a library like xlsx
        reject(new Error('Please save your Excel file as CSV format and upload the CSV file instead.'));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a CSV file containing asset data
 * Required fields: serialNumber
 * Optional fields: All other asset fields
 */
export function parseCSV(csvContent: string): CSVAsset[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // No required headers - all fields are optional

  // Parse data rows
  const assets: CSVAsset[] = [];
  let emptyRowsSkipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      emptyRowsSkipped++;
      continue; // Skip empty lines
    }

    const values = lines[i].split(',').map(value => value.trim().replace(/^"(.*)"$/, '$1')); // Remove quotes

    // Handle rows with fewer columns than headers (common in CSV exports)
    while (values.length < headers.length) {
      values.push('');
    }

    if (values.length > headers.length) {
      console.warn(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns. Truncating extra values.`);
      values.splice(headers.length);
    }

    const asset: any = {};
    let hasAnyData = false;

    headers.forEach((header, index) => {
      const value = values[index];
      if (!value || value === '' || value === 'N/A') return; // Skip empty values

      hasAnyData = true; // Mark that this row has some data

      // Map CSV headers to asset properties with comprehensive field mapping
      switch (header) {
        case 'knoxid':
        case 'knox_id':
        case 'knox id':
          asset.knoxId = value;
          break;
        case 'serialnumber':
        case 'serial_number':
        case 'serial number':
        case 'serial':
          asset.serialNumber = value;
          break;
        case 'assettag':
        case 'asset tag':
        case 'asset_tag':
        case 'tag':
          asset.assetTag = value;
          break;
        case 'name':
        case 'asset name':
        case 'asset_name':
        case 'devicename':
        case 'device_name':
        case 'device name':
          asset.name = value;
          break;
        case 'category':
        case 'type':
        case 'device type':
        case 'device_type':
          asset.category = value;
          break;
        case 'status':
        case 'state':
          asset.status = value;
          break;
        case 'condition':
        case 'asset_condition':
        case 'asset condition':
          asset.condition = value;
          break;
        case 'model':
        case 'model_number':
        case 'model number':
          asset.model = value;
          break;
        case 'manufacturer':
        case 'brand':
        case 'make':
        case 'vendor':
          asset.manufacturer = value;
          break;
        case 'purchasedate':
		case 'purchaseDate':
        case 'purchase_date':
        case 'purchase date':
        case 'acquired_date':
        case 'acquired date':
        case 'dateacquired':
        case 'date_acquired':
          asset.purchaseDate = value;
          break;
        case 'purchasecost':
        case 'purchase_cost':
        case 'purchase cost':
        case 'cost':
        case 'price':
        case 'value':
          asset.purchaseCost = value;
          break;
        case 'location':
        case 'site':
        case 'office':
        case 'building':
        case 'room':
          asset.location = value;
          break;
        case 'ipaddress':
        case 'ip address':
        case 'ip_address':
        case 'ip':
          asset.ipAddress = value;
          break;
        case 'macaddress':
        case 'mac address':
        case 'mac_address':
        case 'mac':
          asset.macAddress = value;
          break;
        case 'ostype':
        case 'os type':
        case 'os_type':
        case 'os':
        case 'operating_system':
        case 'operating system':
          asset.osType = value;
          break;
        case 'department':
        case 'dept':
        case 'division':
        case 'unit':
          asset.department = value;
          break;
        case 'description':
        case 'notes':
        case 'comments':
        case 'remarks':
          asset.description = value;
          break;
        case 'warranty':
        case 'warranty_date':
        case 'warranty date':
        case 'warranty_expiry':
        case 'warranty expiry':
          asset.warranty = value;
          break;
        case 'supplier':
        case 'vendor_name':
        case 'vendor name':
          asset.supplier = value;
          break;
        default:
          // Store unknown headers as custom fields
          asset[header] = value;
          break;
      }
    });

    // Only include rows that have actual data
    if (hasAnyData) {
      assets.push(asset as CSVAsset);
    } else {
      emptyRowsSkipped++;
      console.log(`Skipping empty data row ${i + 1}`);
    }
  }

  console.log(`CSV parsing completed: ${assets.length} assets parsed, ${emptyRowsSkipped} empty rows skipped`);
  return assets;
}

/**
 * Convert CSV assets to database asset format
 */
export function convertCSVToAssets(csvAssets: CSVAsset[]): InsertAsset[] {
  if (!Array.isArray(csvAssets)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvAssets.map((csvAsset, index) => {
    // Properly handle condition mapping - preserve actual values from CSV
    let condition = 'Good'; // default
    if (csvAsset.condition && csvAsset.condition.trim() !== '') {
      const conditionValue = csvAsset.condition.trim();
      // Map common condition variations to our standard values
      if (conditionValue.toLowerCase() === 'bad' || conditionValue.toLowerCase() === 'poor' || conditionValue.toLowerCase() === 'damaged') {
        condition = 'Bad';
      } else if (conditionValue.toLowerCase() === 'good' || conditionValue.toLowerCase() === 'excellent' || conditionValue.toLowerCase() === 'working') {
        condition = 'Good';
      } else {
        // Use the exact value from CSV if it doesn't match common variations
        condition = conditionValue;
      }
    }

    return {
      assetTag: csvAsset.assetTag || null,
      name: csvAsset.name || null,
      serialNumber: csvAsset.serialNumber || '',
      category: csvAsset.category || 'Laptop', // Default category is required
      status: csvAsset.status as any || AssetStatus.AVAILABLE, // Default status is required
      condition: condition,
      model: csvAsset.model || null,
      purchaseDate: csvAsset.purchaseDate || null,
      manufacturer: csvAsset.manufacturer || null,
      purchaseCost: csvAsset.purchaseCost || null,
      location: csvAsset.location || null,
      knoxId: csvAsset.knoxId || null,
      ipAddress: csvAsset.ipAddress || null,
      macAddress: csvAsset.macAddress || null,
      osType: csvAsset.osType || null,
      department: csvAsset.department || null,
      notes: csvAsset.notes || null,
    };
  });
}

/**
 * Parse a CSV file containing component data
 */
export function parseComponentCSV(csvContent: string): CSVComponent[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['name', 'category'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const components: CSVComponent[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = lines[i].split(',').map(value => value.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
    }

    const component: any = {};

    headers.forEach((header, index) => {
      // Map CSV headers to component properties
      switch (header) {
        case 'name':
          component.name = values[index];
          break;
        case 'category':
          component.category = values[index];
          break;
        case 'quantity':
          component.quantity = values[index];
          break;
        case 'serialnumber':
        case 'serial number':
        case 'serial_number':
          component.serialNumber = values[index];
          break;
        case 'manufacturer':
          component.manufacturer = values[index];
          break;
        case 'model':
          component.model = values[index];
          break;
        case 'notes':
          component.notes = values[index];
          break;
        default:
          // Ignore unknown headers
          break;
      }
    });

    // Validate required fields
    if (!component.name || !component.category) {
      throw new Error(`Line ${i + 1} is missing required values`);
    }

    components.push(component as CSVComponent);
  }

  return components;
}

/**
 * Convert CSV components to database component format
 */
export function convertCSVToComponents(csvComponents: CSVComponent[]): InsertComponent[] {
  if (!Array.isArray(csvComponents)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvComponents.map(csvComponent => {
    const quantity = csvComponent.quantity ? parseInt(csvComponent.quantity) : 1;

    return {
      name: csvComponent.name,
      category: csvComponent.category,
      description: null,
      purchaseDate: null,
      purchaseCost: null,
      location: null,
      serialNumber: csvComponent.serialNumber || null,
      model: csvComponent.model || null,
      manufacturer: csvComponent.manufacturer || null,
      notes: csvComponent.notes || `Imported via CSV`,
      quantity: quantity,
    };
  });
}

/**
 * Parse a CSV file containing accessory data
 */
export function parseAccessoryCSV(csvContent: string): CSVAccessory[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['name', 'category'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const accessories: CSVAccessory[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = lines[i].split(',').map(value => value.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
    }

    const accessory: any = {};

    headers.forEach((header, index) => {
      // Map CSV headers to accessory properties
      switch (header) {
        case 'name':
          accessory.name = values[index];
          break;
        case 'category':
          accessory.category = values[index];
          break;
        case 'status':
          accessory.status = values[index];
          break;
        case 'quantity':
          accessory.quantity = values[index];
          break;
        case 'serialnumber':
        case 'serial number':
        case 'serial_number':
          accessory.serialNumber = values[index];
          break;
        case 'manufacturer':
          accessory.manufacturer = values[index];
          break;
        case 'model':
          accessory.model = values[index];
          break;
        case 'notes':
          accessory.notes = values[index];
          break;
        default:
          // Ignore unknown headers
          break;
      }
    });

    // Validate required fields
    if (!accessory.name || !accessory.category) {
      throw new Error(`Line ${i + 1} is missing required values`);
    }

    accessories.push(accessory as CSVAccessory);
  }

  return accessories;
}

/**
 * Convert CSV accessories to database accessory format
 */
export function convertCSVToAccessories(csvAccessories: CSVAccessory[]): InsertAccessory[] {
  if (!Array.isArray(csvAccessories)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvAccessories.map(csvAccessory => {
    const quantity = csvAccessory.quantity ? parseInt(csvAccessory.quantity) : 1;

    // Map status string to status enum or default to AVAILABLE
    let status = AccessoryStatus.AVAILABLE;
    if (csvAccessory.status) {
      const statusLower = csvAccessory.status.toLowerCase();
      if (statusLower.includes('borrowed')) {
        status = AccessoryStatus.BORROWED;
      } else if (statusLower.includes('returned')) {
        status = AccessoryStatus.RETURNED;
      } else if (statusLower.includes('defective')) {
        status = AccessoryStatus.DEFECTIVE;
      }
    }

    return {
      name: csvAccessory.name,
      category: csvAccessory.category,
      status: status,
      description: null,
      purchaseDate: null,
      purchaseCost: null,
      location: null,
      serialNumber: csvAccessory.serialNumber || null,
      model: csvAccessory.model || null,
      manufacturer: csvAccessory.manufacturer || null,
      notes: csvAccessory.notes || `Imported via CSV`,
      quantity: quantity,
      assignedTo: null,
    };
  });
}

/**
 * Convert CSV VM data to VM objects
 */
export function convertCSVToVMs(csvVMs: CSVVM[]): Omit<VirtualMachine, "id">[] {
  if (!Array.isArray(csvVMs)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvVMs.map(csvVM => {
    // Convert internetAccess string to boolean
    let internetAccess = false;
    if (csvVM.internetAccess) {
      const accessValue = csvVM.internetAccess.toLowerCase();
      internetAccess = accessValue === 'true' || accessValue === 'yes' || accessValue === '1';
    }

    return {
      vmId: csvVM.vmId || "N/A",
      vmName: csvVM.vmName || "N/A",
      vmStatus: csvVM.vmStatus || "Provisioning",
      vmIp: csvVM.vmIp || "N/A",
      internetAccess: internetAccess,
      vmOs: csvVM.vmOs || "N/A",
      vmOsVersion: csvVM.vmOsVersion || "N/A",
      hypervisor: csvVM.hypervisor || "N/A",
      hostname: csvVM.hostname || "N/A",
      hostModel: csvVM.hostModel || "N/A",
      hostIp: csvVM.hostIp || "N/A",
      hostOs: csvVM.hostOs || "N/A",
      rack: csvVM.rack || "N/A",
      deployedBy: csvVM.deployedBy || "N/A",
      user: csvVM.user || "N/A",
      department: csvVM.department || "N/A",
      startDate: csvVM.startDate || "N/A",
      endDate: csvVM.endDate || "N/A",
      jiraTicket: csvVM.jiraTicket || "N/A",
      remarks: csvVM.remarks || "N/A",
      dateDeleted: null
    };
  });
}

/**
 * Parse a CSV file containing VM data
 */
export function parseVMCSV(csvContent: string): CSVVM[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['vmid', 'vmname', 'hypervisor'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const vms: CSVVM[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = lines[i].split(',').map(value => value.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
    }

    const vm: any = {};

    // Map headers to values
    headers.forEach((header, index) => {
      const value = values[index];

      // Map common header variations to standard names
      switch (header) {
        case 'vmid':
        case 'vm_id':
        case 'vm id':
          vm.vmId = value;
          break;
        case 'vmname':
        case 'vm_name':
        case 'vm name':
        case 'name':
          vm.vmName = value;
          break;
        case 'vmstatus':
        case 'vm_status':
        case 'vm status':
        case 'status':
          vm.vmStatus = value;
          break;
        case 'vmip':
        case 'vm_ip':
        case 'vm ip':
        case 'ip':
        case 'ipaddress':
        case 'ip_address':
          vm.vmIp = value;
          break;
        case 'internetaccess':
        case 'internet_access':
        case 'internet access':
        case 'internet':
          vm.internetAccess = value;
          break;
        case 'vmos':
        case 'vm_os':
        case 'vm os':
        case 'os':
        case 'operating_system':
          vm.vmOs = value;
          break;
        case 'vmosversion':
        case 'vm_os_version':
        case 'vm os version':
        case 'os_version':
        case 'osversion':
          vm.vmOsVersion = value;
          break;
        case 'hypervisor':
          vm.hypervisor = value;
          break;
        case 'hostname':
        case 'host_name':
        case 'host name':
          vm.hostname = value;
          break;
        case 'hostmodel':
        case 'host_model':
        case 'host model':
        case 'model':
          vm.hostModel = value;
          break;
        case 'hostip':
        case 'host_ip':
        case 'host ip':
          vm.hostIp = value;
          break;
        case 'hostos':
        case 'host_os':
        case 'host os':
          vm.hostOs = value;
          break;
        case 'rack':
          vm.rack = value;
          break;
        case 'deployedby':
        case 'deployed_by':
        case 'deployed by':
          vm.deployedBy = value;
          break;
        case 'user':
          vm.user = value;
          break;
        case 'department':
          vm.department = value;
          break;
        case 'startdate':
        case 'start_date':
        case 'start date':
          vm.startDate = value;
          break;
        case 'enddate':
        case 'end_date':
        case 'end date':
          vm.endDate = value;
          break;
        case 'jiraticket':
        case 'jira_ticket':
        case 'jira ticket':
        case 'ticket':
          vm.jiraTicket = value;
          break;
        case 'remarks':
        case 'notes':
        case 'description':
          vm.remarks = value;
          break;
        default:
          // Ignore unknown headers
          break;
      }
    });

    // Validate required fields are present
    if (!vm.vmId || !vm.vmName || !vm.hypervisor) {
      throw new Error(`Line ${i + 1}: Missing required field(s). vmId: "${vm.vmId}", vmName: "${vm.vmName}", hypervisor: "${vm.hypervisor}"`);
    }

    vms.push(vm as CSVVM);
  }

  if (vms.length === 0) {
    throw new Error('No valid VM records found in CSV file');
  }

  return vms;
}

/**
 * Convert VM data to CSV format for export
 */
export function convertToCSV(vms: VirtualMachine[]): string {
  if (vms.length === 0) {
    return '';
  }

  // Define headers
  const headers = [
    'vmId', 'vmName', 'vmStatus', 'vmIp', 'internetAccess', 'vmOs', 'vmOsVersion',
    'hypervisor', 'hostname', 'hostModel', 'hostIp', 'hostOs', 'rack',
    'deployedBy', 'user', 'department', 'startDate', 'endDate', 'jiraTicket', 'remarks'
  ];

  // Create CSV content
  const csvLines = [headers.join(',')];

  vms.forEach(vm => {
    const row = headers.map(header => {
      let value = vm[header as keyof VirtualMachine];

      // Handle special cases
      if (header === 'internetAccess') {
        value = value ? 'true' : 'false';
      }

      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value || '';
    });

    csvLines.push(row.join(','));
  });

  return csvLines.join('\n');
}

/**
 * Universal file parser that handles both CSV and Excel files
 */
export async function parseFile(file: File): Promise<string> {
  const fileExtension = file.name.toLowerCase().split('.').pop();

  if (fileExtension === 'csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    throw new Error('Excel files are not directly supported. Please save your Excel file as CSV format and upload the CSV file instead.');
  } else {
    throw new Error('Unsupported file format. Please upload a CSV file.');
  }
}

/**
 * Enhanced import function with file validation
 */
/**
 * Generate asset tag with better logic
 */
function generateAssetTag(category?: string, index?: number): string {
  const prefix = 'SRPH';
  const categoryCode = category ? 
    category.toUpperCase().substring(0, 3) : 
    'AST';
  const timestamp = Date.now().toString().slice(-6);
  const indexSuffix = index !== undefined ? String(index + 1).padStart(3, '0') : '001';

  return `${prefix}-${categoryCode}-${timestamp}-${indexSuffix}`;
}

export async function importDataFromFile(file: File, importType: 'assets' | 'components' | 'accessories' | 'vms'): Promise<any> {
  try {
    const csvContent = await parseFile(file);

    let data: any[];

    switch (importType) {
      case 'assets':
        const csvAssets = parseCSV(csvContent);
        if (!Array.isArray(csvAssets)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToAssets(csvAssets);
        break;
      case 'components':
        const csvComponents = parseComponentCSV(csvContent);
        if (!Array.isArray(csvComponents)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToComponents(csvComponents);
        break;
      case 'accessories':
        const csvAccessories = parseAccessoryCSV(csvContent);
        if (!Array.isArray(csvAccessories)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToAccessories(csvAccessories);
        break;
      case 'vms':
        const csvVMs = parseVMCSV(csvContent);
        if (!Array.isArray(csvVMs)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToVMs(csvVMs);
        break;
      default:
        throw new Error('Unsupported import type');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No valid data to import');
    }

    const response = await fetch(`/api/${importType}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [importType]: data }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Import failed');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function importAssets(assets: any[]): Promise<any> {
  const response = await fetch('/api/assets/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assets }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Import failed');
  }

  return response.json();
}

// CSV export functionality
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: Array<{
    key: keyof T;
    label: string;
  }>
) {
  if (!Array.isArray(data) || data.length === 0) return;

  // Use provided columns or infer from first item
  const cols = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
  }));

  // Create CSV content
  const headers = cols.map(col => col.label).join(',');
  const rows = data.map(item => 
    cols.map(col => {
      const value = item[col.key];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Alias for backward compatibility
export const downloadCSV = exportToCSV;