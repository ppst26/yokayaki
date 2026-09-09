"use client";

import React from 'react';
import { IngredientPurchaseManager } from '@/components/stock/IngredientPurchaseManager';

export const StockManager: React.FC = () => {
  return (
    <div className="w-full text-zinc-800 dark:text-zinc-100 font-sans">
      <IngredientPurchaseManager />
    </div>
  );
};
