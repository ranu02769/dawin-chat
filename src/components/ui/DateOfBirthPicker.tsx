import { useState, useEffect } from 'react';

interface Props {
    value: string;
    onChange: (date: string) => void;
    error?: string;
}

export default function DateOfBirthPicker({ value, onChange, error }: Props) {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    // Initialize from value (YYYY-MM-DD)
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setYear(y);
            setMonth(m);
            setDay(d);
        }
    }, []); // Run once on mount if value exists, or we could add value dependency if we want 2-way sync strictness

    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

    const getDaysInMonth = (y: string, m: string) => {
        if (!y || !m) return 31;
        return new Date(parseInt(y), parseInt(m), 0).getDate();
    };

    const daysInMonth = getDaysInMonth(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleChange = (type: 'day' | 'month' | 'year', val: string) => {
        let newDay = day;
        let newMonth = month;
        let newYear = year;

        if (type === 'day') newDay = val;
        if (type === 'month') {
            newMonth = val;
            // Adjust day if new month has fewer days
            const newDaysInMonth = getDaysInMonth(year || currentYear.toString(), val);
            if (parseInt(newDay) > newDaysInMonth) {
                newDay = '';
            }
        }
        if (type === 'year') {
            newYear = val;
            // Adjust day for leap years
            const newDaysInMonth = getDaysInMonth(val, month || '01');
            if (parseInt(newDay) > newDaysInMonth) {
                newDay = '';
            }
        }

        if (type === 'day') setDay(val);
        if (type === 'month') setMonth(val);
        if (type === 'year') setYear(val);

        if (newYear && newMonth && newDay) {
            onChange(`${newYear}-${newMonth}-${newDay}`);
        } else {
            // Optional: Call onChange with empty if incomplete?
            // For now, only update if complete to avoid partial dates
            // onChange(''); 
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Date of Birth</label>
            <div className="flex gap-2">
                {/* Year - First for better UX on mobile often */}
                <select
                    value={year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    className="input-field flex-1 min-w-[30%]"
                    style={{ paddingRight: '0.5rem' }}
                >
                    <option value="">Year</option>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {/* Month */}
                <select
                    value={month}
                    onChange={(e) => handleChange('month', e.target.value)}
                    className="input-field flex-1"
                >
                    <option value="">Month</option>
                    {months.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                {/* Day */}
                <select
                    value={day}
                    onChange={(e) => handleChange('day', e.target.value)}
                    className="input-field flex-1 min-w-[20%]"
                >
                    <option value="">Day</option>
                    {days.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>
            {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
        </div>
    );
}
