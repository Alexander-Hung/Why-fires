import React, { useEffect, useState } from 'react';
import '../styles/DateFilter.css';

export const DateFilter = ({
                               expanded,
                               toggleExpand,
                               year,
                               onYearChange,
                               month,
                               onMonthChange,
                               date,
                               onDateChange
                           }) => {
    const [minDate, setMinDate] = useState('');
    const [maxDate, setMaxDate] = useState('');

    // Month text mapping
    const monthText = {
        0: 'All Months',
        1: 'January',
        2: 'February',
        3: 'March',
        4: 'April',
        5: 'May',
        6: 'June',
        7: 'July',
        8: 'August',
        9: 'September',
        10: 'October',
        11: 'November',
        12: 'December'
    };

    // Update date range when year or month changes
    useEffect(() => {
        updateDateRange();
    }, [year, month]);

    const updateDateRange = () => {
        let min, max;
        if (month === 0) { // All months
            min = `${year}-01-01`;
            max = `${year}-12-31`;
        } else {
            const daysInMonth = new Date(year, month, 0).getDate();
            min = `${year}-${String(month).padStart(2, '0')}-01`;
            max = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
        }
        setMinDate(min);
        setMaxDate(max);
    };

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        onYearChange(newYear);
    };

    const handleMonthChange = (e) => {
        const newMonth = parseInt(e.target.value);
        onMonthChange(newMonth);
    };

    const handleDateChange = (e) => {
        onDateChange(e.target.value);
    };

    return (
        <div id="dateContainer">
            <div id="topSection2">
                <div id="topTitle2">Date/Time</div>
                <div id="topButton2">
                    <button id="nope2" onClick={toggleExpand}></button>
                </div>
            </div>

            <div id="expandContainer2" className={expanded ? 'expanded' : 'collapsed'}>
                <div id="expandContract2" className={expanded ? 'expanded' : 'collapsed'}>
                    <p><b>Years</b></p>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="range"
                                id="yearSlider"
                                min="2001"
                                max="2024"
                                value={year}
                                onChange={handleYearChange}
                            />
                            <span id="yearDisplay">{year}</span>
                        </label>
                    </div>

                    <p><b>Months</b></p>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="range"
                                id="monthSlider"
                                min="0"
                                max="12"
                                value={month}
                                onChange={handleMonthChange}
                            />
                            <span id="monthDisplay">{monthText[month]}</span>
                        </label>
                    </div>

                    <p><b>Date</b></p>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="date"
                                className="checkbox__input"
                                id="dateFilter"
                                min={minDate}
                                max={maxDate}
                                value={date}
                                onChange={handleDateChange}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};