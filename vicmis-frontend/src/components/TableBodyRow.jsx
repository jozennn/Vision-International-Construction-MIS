import React from 'react';

const TableBodyRow = ({ data }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'In Stock':
        return 'status-badge in-stock';
      case 'Low Stock':
        return 'status-badge low-stock';
      default:
        return 'status-badge';
    }
  };

  return (
    <tr>
      <td>{data.id}</td>
      <td>{data.name}</td>
      <td>{data.category}</td>
      <td>{data.quantity}</td>
      <td>
        <span className={getStatusClass(data.status)}>{data.status}</span>
      </td>
      <td>
        <button className="edit-button">Edit</button>
      </td>
      <td>{data.description}</td>
    </tr>
  );
};

export default TableBodyRow;