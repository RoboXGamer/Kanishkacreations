import type { CartItemInput, LocalCart } from "./types";

export const CART_STORAGE_KEY = "kc_cart_v1";
export const LEGACY_INQUIRY_KEY = "product_inquiries";

function safeWindow() {
    return typeof window !== "undefined" ? window : undefined;
}

export function emptyCart(): LocalCart {
    return {
        items: [],
        updatedAt: new Date().toISOString(),
    };
}

export function readCart(): LocalCart {
    const win = safeWindow();
    if (!win) {
        return emptyCart();
    }

    migrateLegacyInquiryCart();
    const raw = win.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
        return emptyCart();
    }

    try {
        const parsed = JSON.parse(raw) as LocalCart;
        if (!parsed.items || !Array.isArray(parsed.items)) {
            return emptyCart();
        }
        return parsed;
    } catch {
        return emptyCart();
    }
}

export function writeCart(cart: LocalCart) {
    const win = safeWindow();
    if (!win) {
        return;
    }

    win.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
            ...cart,
            updatedAt: new Date().toISOString(),
        }),
    );
}

export function migrateLegacyInquiryCart() {
    const win = safeWindow();
    if (!win) {
        return;
    }
    if (win.localStorage.getItem(CART_STORAGE_KEY)) {
        return;
    }

    const legacy = win.localStorage.getItem(LEGACY_INQUIRY_KEY);
    if (!legacy) {
        return;
    }

    try {
        const parsed = JSON.parse(legacy) as string[];
        const items = parsed.map((entry) => ({
            productSlug: entry,
            quantity: 1,
        }));
        writeCart({
            items,
            updatedAt: new Date().toISOString(),
        });
        win.localStorage.removeItem(LEGACY_INQUIRY_KEY);
    } catch {
        win.localStorage.removeItem(LEGACY_INQUIRY_KEY);
    }
}

export function addToCart(productSlug: string, quantity = 1) {
    const cart = readCart();
    const existing = cart.items.find((item) => item.productSlug === productSlug);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.items.push({ productSlug, quantity });
    }
    writeCart(cart);
    return cart;
}

export function updateCartItem(productSlug: string, quantity: number) {
    const cart = readCart();
    cart.items = cart.items
        .map((item) =>
            item.productSlug === productSlug ? { ...item, quantity } : item,
        )
        .filter((item) => item.quantity > 0);
    writeCart(cart);
    return cart;
}

export function removeFromCart(productSlug: string) {
    const cart = readCart();
    cart.items = cart.items.filter((item) => item.productSlug !== productSlug);
    writeCart(cart);
    return cart;
}

export function clearCart() {
    writeCart(emptyCart());
}

export function getCartCount(items?: CartItemInput[]) {
    return (items ?? readCart().items).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
    );
}
