import { useState } from 'react'
import { loadCards, storageKey } from '../lib/board'
import type { Card, Status } from '../lib/board'

export function useBoard() {
  const [cards, setCards] = useState(loadCards)
  const [storageError, setStorageError] = useState(false)

  function saveCards(nextCards: Card[]) {
    setCards(nextCards)
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextCards))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function addCard(title: string, description: string, status: Status) {
    if (!title.trim()) return
    saveCards([...cards, { id: crypto.randomUUID(), title: title.trim(), description: description.trim(), status }])
  }

  function moveCard(id: string, status: Status) {
    saveCards(cards.map(card => card.id === id ? { ...card, status } : card))
  }

  return { cards, storageError, addCard, moveCard }
}
