/**
 * Converts an array of objects to a CSV string.
 * @param data Array of objects to convert
 * @param headers Optional array of headers (keys). If not provided, keys from the first object are used.
 * @returns CSV string
 */
export function convertToCSV(data: any[], headers?: string[]): string {
    if (!data || data.length === 0) return '';

    const cols = headers || Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(cols.join(','));

    // Add data rows
    for (const row of data) {
        const values = cols.map(col => {
            const val = row[col];
            // Escape quotes and wrap in quotes if necessary
            const escaped = (val === undefined || val === null) ? '' : String(val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Triggers a browser download for a CSV file.
 * @param csvContent The CSV string content
 * @param fileName The name of the file to download
 */
export function downloadCSV(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Parses a CSV string into an array of objects.
 * Expects the first row to be headers.
 * @param csvText The raw CSV text
 * @returns Array of objects
 */
export function parseCSV(csvText: string): any[] {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const obj: any = {};
        const currentLine = lines[i];

        // Simple split by comma, handling quotes is complex without a library but basic support:
        // This regex splits by comma but ignores commas inside quotes
        const values = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

        // Fallback if match failed or simple split
        const simpleValues = values.length > 0 ? values : currentLine.split(',');

        headers.forEach((header, index) => {
            let val = simpleValues[index] ? simpleValues[index].trim() : '';
            // Remove surrounding quotes
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            // Unescape double quotes
            val = val.replace(/""/g, '"');
            obj[header] = val;
        });

        result.push(obj);
    }
    return result;
}
