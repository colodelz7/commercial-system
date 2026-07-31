import { useState, useCallback } from 'react';
import { gid } from '../lib/format';

/**
 * Hook genérico pra qualquer entidade simples do DB (getAll/saveOne/deleteOne).
 * dbGetAll: () => array, dbSaveOne: (item) => void, dbDeleteOne: (id) => void
 */
export function useEntity(dbGetAll, dbSaveOne, dbDeleteOne) {
  const [items, setItems] = useState(() => dbGetAll() || []);

  const salvar = useCallback((dados) => {
    const id = dados.id || gid();
    dbSaveOne({ ...dados, id });
    setItems(dbGetAll() || []);
    return id;
  }, [dbGetAll, dbSaveOne]);

  const excluir = useCallback((id) => {
    dbDeleteOne(id);
    setItems(dbGetAll() || []);
  }, [dbGetAll, dbDeleteOne]);

  const recarregar = useCallback(() => setItems(dbGetAll() || []), [dbGetAll]);

  return { items, salvar, excluir, recarregar };
}
