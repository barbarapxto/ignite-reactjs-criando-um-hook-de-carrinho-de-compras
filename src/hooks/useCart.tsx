import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
import { formatPrice } from '../util/format';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            //Caso o produto já exista no carrinho, não se deve adicionar um novo produto repetido, apenas incrementar em 1 unidade a quantidade;
            const productExist = cart.some((p: Product) => p.id === productId);
            if (productExist) {
                const productToIncrement = cart.filter(
                    (p: Product) => p.id === productId
                );

                const newAmount = productToIncrement[0].amount + 1;

                const productAmount: UpdateProductAmount = {
                    productId: productId,
                    amount: newAmount,
                };
                updateProductAmount(productAmount);
                return;
            }

            //verificar se existe a quantidade desejada do produto
            const responseStock = await api.get<Stock>(`/stock/${productId}`);
            const stock = responseStock.data;
            if (stock.amount === 0) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const responseProduct = await api.get<Product>(
                `/products/${productId}`
            );
            const newProduct = responseProduct.data;
            newProduct.amount = 1;

            setCart([...cart, newProduct]);
            //O valor atualizado do carrinho deve ser perpetuado no **localStorage** utilizando o método `setItem`.
            localStorage.setItem(
                '@RocketShoes:cart',
                JSON.stringify([...cart, newProduct])
            );
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const productExist = cart.some((p: Product) => p.id === productId);

            if (!productExist) throw new Error();

            const newCart = cart.filter((p: Product) => p.id !== productId);
                setCart(newCart);
                localStorage.setItem(
                    '@RocketShoes:cart',
                    JSON.stringify(newCart)
                );
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            //Se a quantidade do produto for menor ou igual a zero, sair da função
            if (amount <= 0) return;

            //Verificar se existe no estoque a quantidade desejada do produto.
            const stock = await api.get<Stock>(`/stock/${productId}`);
            const amountStock = stock.data.amount;

            if (amount > amountStock) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            //O valor atualizado do carrinho deve ser perpetuado no localStorage utilizando o método setItem
            const newCart = cart.map((product) => {
                if (product.id === productId) {
                    const productIncremented = {
                        ...product,
                        amount: amount,
                    };

                    return productIncremented;
                }

                return product;
            });
            setCart(newCart);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
