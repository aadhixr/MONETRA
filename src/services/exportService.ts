// MONETRA V3 - Multi-Format Financial Export Service (CSV, JSON, PDF)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction, Account, Category } from '../types';
import { formatPaise, toRupees } from '../engine/currency';
import { AccountingEngine } from '../engine/accountingEngine';

export class ExportService {
  /**
   * Generates and downloads a clean CSV file of all transactions.
   */
  static exportTransactionsCSV(
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[],
    filename = 'monetra_transactions.csv'
  ): void {
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Description',
      'Category',
      'Amount (INR)',
      'Account',
      'Transfer Destination',
      'Payment Method',
      'Notes',
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type.toUpperCase(),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${categoryMap.get(t.category_id) || 'General'}"`,
      toRupees(t.amount_paise).toFixed(2),
      `"${accountMap.get(t.account_id) || 'Unknown'}"`,
      t.to_account_id ? `"${accountMap.get(t.to_account_id) || ''}"` : '',
      t.payment_method || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generates a PDF Financial Statement with institution-grade styling.
   */
  static exportFinancialStatementPDF(
    month: string,
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[]
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const ledger = AccountingEngine.calculateMonthlyLedger(month, accounts, transactions);
    const totalBalance = AccountingEngine.calculateTotalAvailableBalance(accounts, transactions);

    // Header Background
    doc.setFillColor(9, 11, 8); // #090B08 Obsidian Black
    doc.rect(0, 0, 210, 42, 'F');

    // Title & Neon Accent
    doc.setTextColor(231, 255, 50); // #E7FF32 Neon Lime
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MONETRA', 14, 20);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Institutional Financial Statement', 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(161, 166, 154);
    doc.text(`Period: ${month}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 36);

    // Summary Box
    doc.setFillColor(28, 32, 25); // #1C2019 Card Surface
    doc.roundedRect(14, 48, 182, 32, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(161, 166, 154);
    doc.text('TOTAL BALANCE', 22, 57);
    doc.text('MONTHLY INCOME', 68, 57);
    doc.text('MONTHLY EXPENSES', 114, 57);
    doc.text('NET SAVINGS', 160, 57);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(231, 255, 50); // Neon Lime for balance
    doc.text(formatPaise(totalBalance), 22, 68);

    doc.setTextColor(168, 230, 106); // Mint for income
    doc.text(formatPaise(ledger.total_income_paise), 68, 68);

    doc.setTextColor(255, 104, 104); // Coral for expenses
    doc.text(formatPaise(ledger.total_expenses_paise), 114, 68);

    doc.setTextColor(255, 255, 255);
    doc.text(formatPaise(ledger.net_savings_paise), 160, 68);

    // Transactions Table
    const tableData = transactions
      .filter((t) => !t.is_deleted && t.date.startsWith(month))
      .map((t) => [
        t.date,
        t.description,
        categoryMap.get(t.category_id) || 'General',
        accountMap.get(t.account_id) || 'Primary',
        t.type.toUpperCase(),
        `${t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}${formatPaise(t.amount_paise)}`,
      ]);

    autoTable(doc, {
      startY: 86,
      head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [21, 24, 18],
        textColor: [231, 255, 50],
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        textColor: [50, 50, 50],
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 246],
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`monetra_statement_${month}.pdf`);
  }
}
