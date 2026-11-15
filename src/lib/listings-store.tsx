"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Listing, SellerMessage } from "./types";
import { MOCK_LISTINGS } from "./mock-data";

interface ListingsContextValue {
  listings: Listing[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addListing: (input: Omit<Listing, "id" | "createdAt">) => Listing;
  upsertListing: (listing: Listing) => void;
  getListingById: (id: string) => Listing | undefined;
  messages: SellerMessage[];
  sendMessage: (
    listingId: string,
    buyerEmail: string,
    message: string
  ) => SellerMessage;
  addMessage: (message: SellerMessage) => void;
  mergeMessages: (listingId: string, incoming: SellerMessage[]) => void;
}

const ListingsContext = createContext<ListingsContextValue | null>(null);

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<SellerMessage[]>([]);

  useEffect(() => {
    let active = true;
    async function loadListings() {
      try {
        const res = await fetch("/api/listings");
        if (!res.ok) return;
        const data = (await res.json()) as {
          listings?: Listing[];
          source?: string;
        };
        if (active && Array.isArray(data.listings)) {
          if (data.source === "supabase" && data.listings.length > 0) {
            setListings(data.listings);
          } else if (data.source === "mock" && data.listings.length > 0) {
            setListings(data.listings);
          }
        }
      } catch {
        // Keep initial MOCK_LISTINGS on network error
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadListings();
    return () => {
      active = false;
    };
  }, []);

  const addListing = (input: Omit<Listing, "id" | "createdAt">): Listing => {
    const newListing: Listing = {
      ...input,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setListings((prev) => [newListing, ...prev]);
    return newListing;
  };

  const upsertListing = (listing: Listing) => {
    setListings((prev) => {
      const exists = prev.some((item) => item.id === listing.id);
      if (exists) {
        return prev.map((item) => (item.id === listing.id ? listing : item));
      }
      return [listing, ...prev];
    });
  };

  const getListingById = (id: string) =>
    listings.find((item) => item.id === id);

  const sendMessage = (
    listingId: string,
    buyerEmail: string,
    message: string
  ): SellerMessage => {
    const newMessage: SellerMessage = {
      id: `msg-${Date.now()}`,
      listingId,
      buyerEmail,
      message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [newMessage, ...prev]);
    return newMessage;
  };

  const addMessage = (message: SellerMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [message, ...prev];
    });
  };

  const mergeMessages = (listingId: string, incoming: SellerMessage[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newOnes = incoming.filter(
        (m) => m.listingId === listingId && !existingIds.has(m.id)
      );
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  };

  return (
    <ListingsContext.Provider
      value={{
        listings,
        isLoading,
        searchQuery,
        setSearchQuery,
        addListing,
        upsertListing,
        getListingById,
        messages,
        sendMessage,
        addMessage,
        mergeMessages,
      }}
    >
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) {
    throw new Error("useListings must be used within a ListingsProvider");
  }
  return ctx;
}
