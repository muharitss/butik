import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerForm } from '../components/CustomerForm.tsx';
import { createCustomer } from '../api/customers.api.ts';
import type { CustomerInput, PossibleDuplicate } from '../types/customers.types.ts';

export const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const handleCreate = async (
    values: CustomerInput
  ): Promise<{ possibleDuplicate?: PossibleDuplicate; createdId?: string }> => {
    const result = await createCustomer(values);

    if (result.possibleDuplicate) {
      // Return so CustomerForm displays the dismissible banner
      return {
        possibleDuplicate: result.possibleDuplicate,
        createdId: result.customer.id,
      };
    }

    // Direct navigation if no warning
    navigate(`/customers/${result.customer.id}`);
    return {};
  };

  return (
    <div className="py-2" id="customer-create-page">
      <CustomerForm
        isEditing={false}
        onSubmit={handleCreate}
        onCancel={() => navigate('/customers')}
      />
    </div>
  );
};
