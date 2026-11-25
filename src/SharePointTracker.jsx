import React, { useEffect, useState } from 'react';

export default function NativeTrackerDashboard() {
    const [trackerRows, setTrackerRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the file directly from your local public folder
        fetch('/data.csv')
            .then(response => response.text())
            .then(csvText => {
                // Break the CSV content into individual lines
                const lines = csvText.split('\n').filter(line => line.trim() !== '');
                
                // Extract column headers from the very first row
                const headers = lines[0].split(',');

                // Map the remaining rows into structured JSON objects
                const parsedData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const rowObject = {};
                    headers.forEach((header, index) => {
                        // Clean up spaces or quotes from headers and values
                        const cleanHeader = header.replace(/['"]+/g, '').trim();
                        const cleanValue = values[index] ? values[index].replace(/['"]+/g, '').trim() : '';
                        rowObject[cleanHeader] = cleanValue;
                    });
                    return rowObject;
                });

                setTrackerRows(parsedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error reading your CSV file:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>Loading your MasterTracker local file...</p>;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>MasterTracker Dummy Dashboard</h2>
            <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        {trackerRows.length > 0 && Object.keys(trackerRows[0]).map((header, i) => (
                            <th key={i} style={{ backgroundColor: '#f2f2f2' }}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {trackerRows.map((row, index) => (
                        <tr key={index}>
                            {Object.values(row).map((val, i) => (
                                <td key={i}>{val}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
