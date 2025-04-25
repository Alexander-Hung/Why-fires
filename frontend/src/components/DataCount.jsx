import React from 'react';

export const DataCount = ({ count }) => {
    // Format the count with commas for thousands separator
    const formattedCount = count.toLocaleString();

    return (
        <div className="data-count-container">
            <div
                title="The total amount of data points collected in the selection"
                style={{
                    padding: '15px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(43, 45, 47, 0.9)',
                    marginTop: '10px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b>Total Data Points:</b>
                    <span id="totalDataPoints" style={{
                        fontWeight: 'bold',
                        fontSize: '18px',
                        backgroundColor: 'rgba(60, 63, 65, 0.9)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        marginLeft: '10px'
                    }}>
            {formattedCount}
          </span>
                </div>

                {count > 0 && (
                    <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        opacity: 0.8,
                        textAlign: 'right'
                    }}>
                        {count > 10000 ? 'Consider refining your selection for better performance' : ''}
                    </div>
                )}
            </div>
        </div>
    );
};