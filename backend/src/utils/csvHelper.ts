export const escapeCsvValue = (value : unknown) => {
    if(value === null || value === undefined) {
        return "";
    }
    const stringValue = String(value);

    return `"${stringValue.replace(/"/g, '""')}"`
}

export const createCsvRow = (values : unknown[]) => {
    return values.map(m => escapeCsvValue(m)).join(",");
}