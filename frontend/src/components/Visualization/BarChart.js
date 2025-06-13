import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from 'recharts';
import styles from '../../styles/modules/BarChart.module.css';

const BarChart = ({ data, title }) => {
  const getBarColor = (count) => {
    if (count >= 10) return '#52c41a'; // Green for high count
    if (count >= 5) return '#1890ff';  // Blue for medium count
    if (count >= 2) return '#faad14';  // Orange for low count
    return '#f5222d';                   // Red for very low count
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const value = payload[0].value;
    const percentage = (value / data.reduce((sum, item) => sum + item.count, 0) * 100).toFixed(1);

    return (
      <div className={styles.tooltip}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value} students</p>
        <p className={styles.percentage}>{percentage}% of class</p>
      </div>
    );
  };

  return (
    <div className={styles.chartContainer}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer>
          <RechartsBarChart
            data={data}
            margin={{ top: 20, right: 30, bottom: 60, left: 30 }}
            barSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 12, fill: '#595959' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#595959' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Number of Students">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
