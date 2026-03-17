import React from 'react';
import styles from './StatCard.module.css';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={`${styles.iconWrapper} ${styles[color]}`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className={`${styles.trend} ${trend === 'up' ? styles.trendUp : styles.trendDown}`}>
                        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {trendValue}
                    </span>
                )}
            </div>
            <div className={styles.content}>
                <h3 className={styles.value}>{value}</h3>
                <p className={styles.title}>{title}</p>
            </div>
        </div>
    );
};

export default StatCard;