import React from 'react';
import './Tabs.css';


const Tabs = ({ tabs, activeTab, onTabChange }) => {
return (
<div className="tabs-container">
{tabs.map((tab) => (
<button
key={tab}
className={`tab-button ${activeTab === tab ? 'active' : ''}`}
onClick={() => onTabChange(tab)}
>
{tab}
</button>
))}
</div>
);
};


export default Tabs;