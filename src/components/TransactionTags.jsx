import { useState } from 'react';
import { getFinalTags, getTypeTagConfig, getMethodTagConfig, updateTransactionType } from '../utils/transactionTags';

const TransactionTags = ({ transaction, allTransactions = [], editable = false, size = 'sm', onTagUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState('');
  const [localTags, setLocalTags] = useState(null);
  
  // Use local tags if available, otherwise calculate from transaction
  const tags = localTags || getFinalTags(transaction, allTransactions);
  const typeConfig = getTypeTagConfig(tags.type);
  const methodConfig = getMethodTagConfig(tags.method);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };
  
  const handleTypeEdit = async (newType) => {
    try {
      // Optimistically update the local tags immediately
      setLocalTags(prevTags => ({
        ...(prevTags || getFinalTags(transaction, allTransactions)),
        type: newType
      }));
      setIsEditing(false);
      
      // Update backend in background
      await updateTransactionType(transaction.Transaction_ID, newType);
      
      // Notify parent component if callback provided
      if (onTagUpdate) {
        onTagUpdate(transaction.Transaction_ID, { type: newType });
      }
      
    } catch (error) {
      console.error('Failed to update tag:', error);
      // Revert local changes on error
      setLocalTags(null);
      setIsEditing(false);
    }
  };
  
  const typeOptions = [
    'internal',
    'bill-payment', 
    'income',
    'spending'
  ];

  return (
    <div className="flex gap-1 flex-wrap items-center">
      {/* Transaction Type Tag */}
      <div className="relative">
        {isEditing ? (
          <select
            value={editingType}
            onChange={(e) => handleTypeEdit(e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="bg-gray-800 border border-gray-600 rounded text-xs px-2 py-1 text-white"
            autoFocus
          >
            <option value="">Select type...</option>
            {typeOptions.map(type => {
              const config = getTypeTagConfig(type);
              return (
                <option key={type} value={type}>
                  {config.label}
                </option>
              );
            })}
          </select>
        ) : (
          <span
            className={`inline-flex items-center rounded-full font-medium cursor-pointer transition-colors hover:opacity-80 ${typeConfig.color} ${sizeClasses[size]} ${
              editable ? 'hover:ring-2 hover:ring-blue-500' : ''
            }`}
            onClick={editable ? () => {
              setEditingType(tags.type);
              setIsEditing(true);
            } : undefined}
            title={editable ? 'Click to edit transaction type' : typeConfig.label}
          >
            <span>{typeConfig.label}</span>
          </span>
        )}
      </div>
      
      {/* Payment Method Tag */}
      <span
        className={`inline-flex items-center rounded-full font-medium ${methodConfig.color} ${sizeClasses[size]}`}
        title={`Payment method: ${methodConfig.label}`}
      >
        {methodConfig.label}
      </span>
      
      {/* Bank Tag (subtle) */}
      <span
        className={`inline-flex items-center rounded-full font-medium bg-gray-800/30 text-gray-500 border border-gray-700 ${sizeClasses[size]}`}
        title={`Bank: ${tags.bank}`}
      >
        {tags.bank?.split(' ')[0] || 'Bank'}
      </span>
    </div>
  );
};

export default TransactionTags;