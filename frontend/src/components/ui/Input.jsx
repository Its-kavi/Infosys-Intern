import React from 'react';

const Input = ({ label, id, error, ...props }) => {
    return (
        <div className="input-group">
            {label && <label htmlFor={id}>{label}</label>}
            <input id={id} {...props} />
            {error && <span style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{error}</span>}
        </div>
    );
};

export default Input;
