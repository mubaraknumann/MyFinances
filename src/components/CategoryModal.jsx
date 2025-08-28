import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const CategoryModal = ({ isOpen, merchant, onClose, onSave }) => {
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const commonCategories = [
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Personal Care',
    'Investment',
    'Income',
    'Other'
  ];

  useEffect(() => {
    if (isOpen) {
      setCategory('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category.trim()) return;

    setIsSaving(true);
    try {
      await onSave(merchant, category.trim());
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
              </div>
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