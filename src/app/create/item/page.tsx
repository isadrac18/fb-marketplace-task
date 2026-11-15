"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Trash2,
  Upload,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { formatPrice } from "@/components/marketplace/ListingCard";
import {
  MARKETPLACE_CATEGORIES,
  getCategoryBySlug,
} from "@/lib/categories";
import { useListings } from "@/lib/listings-store";
import { ItemCondition } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONDITIONS: ItemCondition[] = [
  "New",
  "Used - Like New",
  "Used - Good",
  "Used - Fair",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB (Vercel-safe)

interface FieldErrors {
  title?: string;
  price?: string;
  sellerEmail?: string;
  image?: string;
}

function CreateItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { upsertListing } = useListings();

  const initialCategory = searchParams.get("category");
  const validInitialCategory = getCategoryBySlug(initialCategory ?? "")
    ? (initialCategory as string)
    : "electronics";

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(validInitialCategory);
  const [condition, setCondition] = useState<ItemCondition>("Used - Like New");
  const [location, setLocation] = useState("Palo Alto, CA");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  const validateField = (
    field: keyof FieldErrors,
    value: string
  ): string | undefined => {
    if (field === "title") {
      if (!value.trim()) return "Title is required.";
      if (value.trim().length < 3)
        return "Title must be at least 3 characters.";
    }
    if (field === "price") {
      if (value.trim() === "") return "Price is required (enter 0 for Free).";
      const num = Number(value);
      if (Number.isNaN(num) || num < 0)
        return "Enter a valid non-negative price.";
    }
    if (field === "sellerEmail") {
      if (!value.trim()) return "Contact email is required.";
      if (!EMAIL_REGEX.test(value.trim()))
        return "Enter a valid email address (e.g. name@example.com).";
    }
    return undefined;
  };

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Unsupported file type. Please upload PNG, JPG, WebP, or GIF.",
      }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: "Image is too large. Maximum file size is 4 MB.",
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));
    setSelectedFile(file);
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileChange(droppedFile);
  };

  const handlePriceChange = (raw: string) => {
    // Allow digits and a single optional decimal point
    const sanitized = raw.replace(/[^0-9.]/g, "");
    setPrice(sanitized);
    if (touched.price) {
      setErrors((prev) => ({
        ...prev,
        price: validateField("price", sanitized),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors = {
      title: validateField("title", title),
      price: validateField("price", price),
      sellerEmail: validateField("sellerEmail", sellerEmail),
      image: errors.image,
    };

    setTouched({ title: true, price: true, sellerEmail: true });
    setErrors(nextErrors);

    if (nextErrors.title || nextErrors.price || nextErrors.sellerEmail) {
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrl = "";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = (await uploadRes.json()) as {
          imageUrl?: string;
          error?: string;
        };
        if (!uploadRes.ok || !uploadData.imageUrl) {
          throw new Error(uploadData.error || "Failed to upload photo.");
        }
        uploadedImageUrl = uploadData.imageUrl;
      }

      const parsedPrice = Number(price);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          price: parsedPrice,
          description:
            description.trim() || "No additional description provided.",
          category,
          location: location.trim() || "Palo Alto, CA",
          imageUrl: uploadedImageUrl,
          sellerEmail: sellerEmail.trim(),
        }),
      });

      const data = (await res.json()) as {
        listing?: import("@/lib/types").Listing;
        error?: string;
      };

      if (!res.ok || !data.listing) {
        throw new Error(data.error || "Failed to create listing.");
      }

      upsertListing({
        ...data.listing,
        condition,
        sellerName: sellerName.trim() || data.listing.sellerName,
      });

      setSubmitSuccess(true);
      router.push(`/item/${data.listing.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setIsSubmitting(false);
    }
  };

  const numericPrice = price.trim() === "" ? null : Number(price);
  const formattedPreviewPrice =
    numericPrice === null || Number.isNaN(numericPrice)
      ? "$0"
      : formatPrice(numericPrice);
  const categoryName = getCategoryBySlug(category)?.name ?? "Category";
  const displaySellerName =
    sellerName.trim() ||
    (sellerEmail.includes("@") ? sellerEmail.split("@")[0] : "You");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Listing Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-[#E4E6EB] bg-white p-5 shadow-xs lg:col-span-5"
      >
        <div>
          <h1 className="text-xl font-bold text-[#050505]">Item for sale</h1>
          <p className="mt-0.5 text-sm text-[#65676B]">
            Add a photo and details to list your item on Marketplace.
          </p>
        </div>

        {/* Drag & Drop Photo Upload */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-[#050505]">
            Photo
          </span>
          {imagePreview ? (
            <div className="relative aspect-square overflow-hidden rounded-xl border border-[#E4E6EB] bg-[#F0F2F5]">
              <Image
                src={imagePreview}
                alt="Uploaded listing preview"
                fill
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 py-2.5 text-xs text-white">
                <span className="inline-flex items-center gap-1.5 truncate font-medium">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{imageName ?? "Photo ready"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                    setImageName(null);
                  }}
                  aria-label="Remove uploaded photo"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/20 px-2.5 py-1 font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/30"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-[#1877F2]",
                isDragging
                  ? "border-[#1877F2] bg-[#E7F3FF]/70"
                  : "border-[#CED0D4] bg-[#F0F2F5]/60 hover:border-[#1877F2] hover:bg-[#E7F3FF]/40"
              )}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full transition-colors",
                  isDragging
                    ? "bg-[#1877F2] text-white"
                    : "bg-[#E4E6EB] text-[#050505]"
                )}
              >
                <ImagePlus className="size-6" />
              </span>
              <span className="mt-2.5 text-sm font-semibold text-[#050505]">
                {isDragging ? "Drop photo here" : "Add photo"}
              </span>
              <span className="mt-0.5 text-xs text-[#65676B]">
                Drag &amp; drop or click to upload (PNG, JPG, WebP · max 4MB)
              </span>
              <input
                type="file"
                accept="image/*"
                aria-label="Upload listing photo"
                className="sr-only"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </label>
          )}
          {errors.image && (
            <p
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.image}</span>
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-semibold text-[#050505]"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (touched.title) {
                setErrors((prev) => ({
                  ...prev,
                  title: validateField("title", e.target.value),
                }));
              }
            }}
            onBlur={() => handleBlur("title", title)}
            placeholder="What are you selling?"
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:outline-none focus:ring-2",
              errors.title
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-[#CED0D4] focus:border-[#1877F2] focus:ring-[#1877F2]/20"
            )}
          />
          {errors.title && (
            <p
              id="title-error"
              role="alert"
              className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.title}</span>
            </p>
          )}
        </div>

        {/* Price & Category */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="price"
                className="text-sm font-semibold text-[#050505]"
              >
                Price <span className="text-red-500">*</span>
              </label>
              {numericPrice !== null && !Number.isNaN(numericPrice) && (
                <span className="text-xs font-semibold text-[#1877F2]">
                  {formattedPreviewPrice}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#65676B]">
                $
              </span>
              <input
                id="price"
                type="text"
                inputMode="decimal"
                required
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? "price-error" : undefined}
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={() => handleBlur("price", price)}
                placeholder="0 for Free"
                className={cn(
                  "h-10 w-full rounded-lg border bg-white pl-7 pr-3 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:outline-none focus:ring-2",
                  errors.price
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : "border-[#CED0D4] focus:border-[#1877F2] focus:ring-[#1877F2]/20"
                )}
              />
            </div>
            {errors.price && (
              <p
                id="price-error"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.price}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1 block text-sm font-semibold text-[#050505]"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#CED0D4] bg-white px-3 text-[15px] text-[#050505] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            >
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Condition & Location */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="condition"
              className="mb-1 block text-sm font-semibold text-[#050505]"
            >
              Condition
            </label>
            <select
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition)}
              className="h-10 w-full rounded-lg border border-[#CED0D4] bg-white px-3 text-[15px] text-[#050505] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-1 block text-sm font-semibold text-[#050505]"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="h-10 w-full rounded-lg border border-[#CED0D4] bg-white px-3 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            />
          </div>
        </div>

        {/* Seller Name & Email */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="sellerName"
              className="mb-1 block text-sm font-semibold text-[#050505]"
            >
              Your name
            </label>
            <input
              id="sellerName"
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder="Optional"
              className="h-10 w-full rounded-lg border border-[#CED0D4] bg-white px-3 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
            />
          </div>

          <div>
            <label
              htmlFor="sellerEmail"
              className="mb-1 block text-sm font-semibold text-[#050505]"
            >
              Contact email <span className="text-red-500">*</span>
            </label>
            <input
              id="sellerEmail"
              type="email"
              required
              aria-invalid={Boolean(errors.sellerEmail)}
              aria-describedby={
                errors.sellerEmail ? "seller-email-error" : undefined
              }
              value={sellerEmail}
              onChange={(e) => {
                setSellerEmail(e.target.value);
                if (touched.sellerEmail) {
                  setErrors((prev) => ({
                    ...prev,
                    sellerEmail: validateField("sellerEmail", e.target.value),
                  }));
                }
              }}
              onBlur={() => handleBlur("sellerEmail", sellerEmail)}
              placeholder="you@example.com"
              className={cn(
                "h-10 w-full rounded-lg border bg-white px-3 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:outline-none focus:ring-2",
                errors.sellerEmail
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-[#CED0D4] focus:border-[#1877F2] focus:ring-[#1877F2]/20"
              )}
            />
            {errors.sellerEmail && (
              <p
                id="seller-email-error"
                role="alert"
                className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.sellerEmail}</span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="description"
              className="text-sm font-semibold text-[#050505]"
            >
              Description
            </label>
            <span className="text-xs text-[#65676B]">
              {description.length}/1000
            </span>
          </div>
          <textarea
            id="description"
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item, condition, and pickup details..."
            className="w-full rounded-lg border border-[#CED0D4] bg-white px-3 py-2 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
          />
        </div>

        {submitSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>Listing published! Redirecting to your item...</span>
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || submitSuccess}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#166FE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          <span>{isSubmitting ? "Publishing..." : "Publish listing"}</span>
        </button>
      </form>

      {/* Right: Real-time Listing Preview */}
      <div className="lg:col-span-7">
        <div className="sticky top-20 rounded-xl border border-[#E4E6EB] bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-[#050505]">Preview</span>
            <span className="rounded-full bg-[#E7F3FF] px-3 py-0.5 text-xs font-semibold text-[#1877F2]">
              {categoryName}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#E4E6EB] bg-[#F0F2F5]">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Listing preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 320px"
                  className="object-cover"
                />
              ) : (
                <div className="px-4 text-center text-sm text-[#65676B]">
                  Your listing photo will appear here
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#050505]">
                  {title.trim() || "Title"}
                </h2>
                <p className="mt-1 text-lg font-bold text-[#050505]">
                  {formattedPreviewPrice}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[#65676B]">
                  <MapPin className="size-3.5" />
                  <span>{location.trim() || "Palo Alto, CA"}</span>
                </p>

                <div className="my-4 border-t border-[#E4E6EB]" />

                <h3 className="text-sm font-bold text-[#050505]">Details</h3>
                <p className="mt-1 text-xs text-[#65676B]">
                  Condition:{" "}
                  <span className="font-medium text-[#050505]">
                    {condition}
                  </span>
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-[#050505]">
                  {description.trim() || "Description will appear here."}
                </p>

                <div className="my-4 border-t border-[#E4E6EB]" />
                <p className="text-xs text-[#65676B]">
                  Seller:{" "}
                  <span className="font-semibold text-[#050505]">
                    {displaySellerName}
                  </span>
                </p>
              </div>

              <div className="mt-6 rounded-lg bg-[#E4E6EB]/70 py-2.5 text-center text-sm font-semibold text-[#65676B]">
                Message Seller
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateItemPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#65676B] transition-colors hover:text-[#050505]"
          >
            <ArrowLeft className="size-4" />
            <span>Choose listing type</span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="rounded-xl border border-[#E4E6EB] bg-white p-8 text-center text-sm text-[#65676B]">
              Loading listing form...
            </div>
          }
        >
          <CreateItemForm />
        </Suspense>
      </main>
    </div>
  );
}
