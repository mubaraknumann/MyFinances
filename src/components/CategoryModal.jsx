import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAvailableCategories, addCustomCategory, isValidCategoryName } from '../utils/categoryManager';

const CategoryModal = ({ isOpen, merchant, onClose, onSave }) => {
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const commonCategories = getAvailableCategories();
  
  const handleCustomCategorySubmit = () => {
    const customCategory = customCategoryInput.trim();
    if (!isValidCategoryName(customCategory)) {
      alert('Please enter a valid category name (1-50 characters)');
      return;
    }
    
    // Add to custom categories if it's new
    if (addCustomCategory(customCategory)) {
      console.log('Added new custom category:', customCategory);
    }
    
    // Use the custom category
    setCategory(customCategory);
    setShowCustomInput(false);
    setCustomCategoryInput('');
  };

  useEffect(() => {
    if (isOpen) {
      setCategory('');
      setShowCustomInput(false);
      setCustomCategoryInput('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Allow empty category (for clearing)
    
    setIsSaving(true);
    try {
      await onSave(merchant, category.trim() || null);
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-gray-800 rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-white">
              Categorize Transaction
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Merchant
              </label>
              <div className="text-white bg-gray-700 px-3 py-2 rounded border">
                {merchant}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="category" className="block text-sm font-medium text-gray-200 mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Enter category name..."
                className="form-input w-full"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-200 mb-3">Quick Select:</p>
              <div className="grid grid-cols-2 gap-2">
                {/* Clear/Uncategorized option */}
                <button
                  type="button"
                  onClick={() => handleCategorySelect('')}
                  className="text-xs px-3 py-2 text-red-300 bg-red-900/30 rounded hover:bg-red-900/50 transition-colors text-left"
                >
                  Clear Category
                </button>
                
                {commonCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className="text-xs px-3 py-2 text-blue-300 bg-blue-900/30 rounded hover:bg-blue-900/50 transition-colors text-left"
                  >
                    {cat}
                  </button>
                ))}
                
                {/* Add custom category button */}
                {!showCustomInput && (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-xs px-3 py-2 text-green-300 bg-green-900/30 rounded hover:bg-green-900/50 transition-colors text-left"
                  >
                    Add New Category
                  </button>
                )}
              </div>
              
              {/* Custom category input */}
              {showCustomInput && (
                <div className="mt-4 p-3 bg-gray-700/50 rounded">
                  <label className="block text-xs font-medium text-gray-300 mb-2">New Category:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomCategorySubmit();
                        } else if (e.key === 'Escape') {
                          setShowCustomInput(false);
                          setCustomCategoryInput('');
                        }
                      }}
                      placeholder="Category name..."
                      className="form-input flex-1 text-xs"
                      maxLength={50}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCustomCategorySubmit}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomCategoryInput('');
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={!category.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CategoryModal;