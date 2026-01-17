'use client';

import { useState } from 'react';
import styles from './TransactionModal.module.css';

interface SelectedFile {
  file: File;
  preview: string;
  status: 'ready' | 'uploading';
}

interface TransactionModalProps {
  isOpen: boolean;
  type: 'expense' | 'income';
  onClose: () => void;
  onSubmit: (amount: number, description: string, receiptBase64s?: string[], receiptNames?: string[]) => Promise<void>;
}

export default function TransactionModal({ 
  isOpen, 
  type, 
  onClose, 
  onSubmit 
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    try {
      setLoading(true);

      // convert selected files to base64 array
      const base64s: string[] = [];
      const names: string[] = [];

      // set statuses to uploading
      setSelectedFiles((prev) => prev.map((p) => ({ ...p, status: 'uploading' })));

      for (const sf of selectedFiles) {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(sf.file);
        });
        base64s.push(b64);
        names.push(sf.file.name);
      }

      await onSubmit(amountNum, description || 'Без описания', base64s.length ? base64s : undefined, names.length ? names : undefined);
      setAmount('');
      setDescription('');
      setSelectedFiles([]);
      onClose();
    } catch (err) {
      setError('Ошибка при добавлении транзакции');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {type === 'expense' ? '- Добавить расход' : '+ Добавить доход'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Сумма (₽)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={styles.input}
              min="0.01"
              step="any"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'expense' ? 'На что потрачено...' : 'Источник дохода...'}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Чеки (опционально)</label>
            <div className={styles.uploadRow}>
              <label className={styles.uploadBtn}>
                Загрузить фото
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    const newSelected = files.map((f) => ({ file: f, preview: URL.createObjectURL(f), status: 'ready' as const }));
                    setSelectedFiles((prev) => [...prev, ...newSelected]);
                    // reset input
                    e.currentTarget.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>

              <div className={styles.thumbs}>
                {selectedFiles.map((sf, idx) => (
                  <div key={idx} className={styles.thumb}>
                    <img src={sf.preview} alt={`preview-${idx}`} />
                    <div className={styles.badge}>{sf.status === 'ready' ? 'Готово' : 'Загрузка...'}</div>
                    <button type="button" className={styles.removeBtn} onClick={() => {
                      // revoke url
                      URL.revokeObjectURL(sf.preview);
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={`${styles.button} ${type === 'expense' ? styles.expenseBtn : styles.incomeBtn}`}
            disabled={loading}
          >
            {loading ? 'Добавление...' : (type === 'expense' ? '- Добавить расход' : '+ Добавить доход')}
          </button>
        </form>
      </div>
    </div>
  );
}
