import React from 'react';
import { ArrowRight, History } from 'lucide-react';

const QuickBookCard = ({ route, onClick }) => {
    return (
        <div 
            onClick={() => onClick(route)}
            style={{
                background: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
                border: '1px solid #f0f0f0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{display:'flex', flexDirection:'column'}}>
                <div style={{fontWeight: '600', color: '#333', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {route.source} <ArrowRight size={14} color="#888"/> {route.destination}
                </div>
                <small style={{color: '#888', marginTop: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <History size={12}/> Booked {route.frequency} times
                </small>
            </div>
            <div style={{
                background: '#e3f2fd', 
                color: '#0f4c81', 
                padding: '6px', 
                borderRadius: '50%', 
                display: 'flex'
            }}>
                <ArrowRight size={16} />
            </div>
        </div>
    );
};

export default QuickBookCard;