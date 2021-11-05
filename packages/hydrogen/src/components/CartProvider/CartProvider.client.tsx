import React, {
  useEffect,
  useCallback,
  useReducer,
  useMemo,
  useRef,
} from 'react';
import type {Reducer} from 'react';
import {flattenConnection} from '../../utilities';
import {
  CartCreateMutation,
  CartCreateMutationVariables,
} from './graphql/CartCreateMutation';
import {Cart, CartAction, State} from './types';
import {
  CartLineAddMutation,
  CartLineAddMutationVariables,
} from './graphql/CartLineAddMutation';
import {
  CartLineAdd,
  CartCreate,
  CartLineRemove,
  CartLineUpdate,
  CartNoteUpdate,
  CartBuyerIdentityUpdate,
  CartAttributesUpdate,
  CartDiscountCodesUpdate,
  CartQuery,
} from '../../graphql/graphql-constants';
import {
  CartLineInput,
  CartInput,
  CartLineUpdateInput,
  CartBuyerIdentityInput,
  AttributeInput,
} from '../../graphql/types/types';
import {useCartFetch} from './hooks';
import {CartContext} from './context';
import {
  CartLineRemoveMutationVariables,
  CartLineRemoveMutation,
} from './graphql/CartLineRemoveMutation';
import {
  CartLineUpdateMutationVariables,
  CartLineUpdateMutation,
} from './graphql/CartLineUpdateMutation';
import {
  CartNoteUpdateMutationVariables,
  CartNoteUpdateMutation,
} from './graphql/CartNoteUpdateMutation';
import {
  CartBuyerIdentityUpdateMutationVariables,
  CartBuyerIdentityUpdateMutation,
} from './graphql/CartBuyerIdentityUpdateMutation';
import {
  CartDiscountCodesUpdateMutationVariables,
  CartDiscountCodesUpdateMutation,
} from './graphql/CartDiscountCodesUpdateMutation';

import {
  CartAttributesUpdateMutationVariables,
  CartAttributesUpdateMutation,
} from './graphql/CartAttributesUpdateMutation';
import {CART_ID_STORAGE_KEY} from './constants';
import {CartFragmentFragment} from './graphql/CartFragment';
import {CartQueryQuery, CartQueryQueryVariables} from './graphql/CartQuery';

function cartReducer(state: State, action: CartAction): State {
  switch (action.type) {
    case 'cartFetch': {
      if (state.status === 'uninitialized') {
        return {
          status: 'fetching',
        };
      }
      break;
    }
    case 'cartCreate': {
      if (state.status === 'uninitialized') {
        return {
          status: 'creating',
        };
      }
      break;
    }
    case 'resolve': {
      const resolvableStatuses = ['updating', 'fetching', 'creating'];
      if (resolvableStatuses.includes(state.status)) {
        return {
          status: 'idle',
          cart: action.cart,
        };
      }
      break;
    }
    case 'reject': {
      if (state.status === 'fetching' || state.status === 'creating') {
        return {status: 'uninitialized', error: action.error};
      } else if (state.status === 'updating') {
        return {
          status: 'idle',
          cart: state.lastValidCart,
          error: action.error,
        };
      }
      break;
    }
    case 'resetCart': {
      if (state.status === 'fetching') {
        return {status: 'uninitialized'};
      }
      break;
    }
    case 'addLineItem': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: state.cart,
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'removeLineItem': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: {
            ...state.cart,
            lines: state.cart.lines.filter(
              ({id}) => !action.lines.includes(id)
            ),
          },
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'updateLineItem': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: {
            ...state.cart,
            lines: state.cart.lines.map((line) => {
              const updatedLine = action.lines.find(({id}) => id === line.id);

              if (updatedLine && updatedLine.quantity) {
                return {
                  ...line,
                  quantity: updatedLine.quantity,
                };
              }

              return line;
            }),
          },
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'noteUpdate': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: state.cart,
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'buyerIdentityUpdate': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: state.cart,
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'cartAttributesUpdate': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: state.cart,
          lastValidCart: state.cart,
        };
      }
      break;
    }
    case 'discountCodesUpdate': {
      if (state.status === 'idle') {
        return {
          status: 'updating',
          cart: state.cart,
          lastValidCart: state.cart,
        };
      }
      break;
    }
  }
  throw new Error(
    `Cannot dispatch event (${action.type}) for current cart state (${state.status})`
  );
}

/**
 * The `CartProvider` component creates a context for using a cart. It creates a cart object and callbacks
 * that can be accessed by any descendent component using the `useCart` hook and related hooks. It also carries out
 * any callback props when a relevant action is performed. For example, if a `onLineAdd` callback is provided,
 * then the callback will be called when a new line item is successfully added to the cart.
 *
 * The `CartProvider` component must be a descendent of the `ShopifyProvider` component.
 * You must use this component if you want to use the `useCart` hook or related hooks, or if you would like to use the `AddToCartButton` component.
 */
export function CartProvider({
  children,
  numCartLines,
  onCreate,
  onLineAdd,
  onLineRemove,
  onLineUpdate,
  onNoteUpdate,
  onBuyerIdentityUpdate,
  onAttributesUpdate,
  onDiscountCodesUpdate,
  cart,
}: {
  /** Any `ReactNode` elements. */
  children: React.ReactNode;
  numCartLines?: number;
  /** A callback that is run automatically when a cart is created. */
  onCreate?: () => void;
  /** A callback that is run automatically when a new cart line is added. */
  onLineAdd?: () => void;
  /** A callback that is run automatically when a cart line is removed. */
  onLineRemove?: () => void;
  /** A callback that is run automatically when a cart line is updated. */
  onLineUpdate?: () => void;
  /** A callback that is run automatically when the cart note is updated. */
  onNoteUpdate?: () => void;
  /** A callback that is run automatically when the cart's buyer identity is updated. */
  onBuyerIdentityUpdate?: () => void;
  /** A callback that is run automatically when the cart's buyer identity is updated. */
  onAttributesUpdate?: () => void;
  /** A callback that is run automatically when the cart's discount codes are updated. */
  onDiscountCodesUpdate?: () => void;
  /**
   * A cart object from the Storefront API to populate the initial state of the provider.
   */
  cart?: CartFragmentFragment;
}) {
  const initialStatus: State = cart
    ? {status: 'idle', cart: cartFromGraphQL(cart)}
    : {status: 'uninitialized'};
  const [state, dispatch] = useReducer<Reducer<State, CartAction>>(
    (state, dispatch) => cartReducer(state, dispatch),
    initialStatus
  );
  const fetch = useCartFetch();

  const cartFetch = useCallback(
    async (cartId: string) => {
      dispatch({type: 'cartFetch'});

      const {data} = await fetch<CartQueryQueryVariables, CartQueryQuery>({
        query: CartQuery,
        variables: {id: cartId, numCartLines},
      });

      if (!data?.cart) {
        window.localStorage.removeItem(CART_ID_STORAGE_KEY);
        dispatch({type: 'resetCart'});
        return;
      }

      dispatch({type: 'resolve', cart: cartFromGraphQL(data.cart)});
    },
    [fetch, numCartLines]
  );

  const cartCreate = useCallback(
    async (cart: CartInput) => {
      dispatch({type: 'cartCreate'});

      onCreate?.();

      const {data, error} = await fetch<
        CartCreateMutationVariables,
        CartCreateMutation
      >({
        query: CartCreate,
        variables: {
          input: cart,
          numCartLines,
        },
      });

      if (error) {
        dispatch({
          type: 'reject',
          error: error,
        });
      }

      if (data?.cartCreate?.cart) {
        dispatch({
          type: 'resolve',
          cart: cartFromGraphQL(data.cartCreate.cart),
        });

        window.localStorage.setItem(
          CART_ID_STORAGE_KEY,
          data.cartCreate.cart.id
        );
      }
    },
    [onCreate, fetch, numCartLines]
  );

  const addLineItem = useCallback(
    async (lines: CartLineInput[], state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'addLineItem'});
        onLineAdd?.();
        const {data, error} = await fetch<
          CartLineAddMutationVariables,
          CartLineAddMutation
        >({
          query: CartLineAdd,
          variables: {
            cartId: state.cart.id!,
            lines: lines,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartLinesAdd?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartLinesAdd.cart),
          });
        }
      }
    },
    [fetch, numCartLines, onLineAdd]
  );

  const removeLineItem = useCallback(
    async (lines: string[], state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'removeLineItem', lines});

        onLineRemove?.();

        const {data, error} = await fetch<
          CartLineRemoveMutationVariables,
          CartLineRemoveMutation
        >({
          query: CartLineRemove,
          variables: {
            cartId: state.cart.id!,
            lines: lines,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error,
          });
        }

        if (data?.cartLinesRemove?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartLinesRemove.cart),
          });
        }
      }
    },
    [fetch, onLineRemove, numCartLines]
  );

  const updateLineItem = useCallback(
    async (lines: CartLineUpdateInput[], state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'updateLineItem', lines});

        onLineUpdate?.();

        const {data, error} = await fetch<
          CartLineUpdateMutationVariables,
          CartLineUpdateMutation
        >({
          query: CartLineUpdate,
          variables: {
            cartId: state.cart.id!,
            lines: lines,
            numCartLines,
          },
        });
        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartLinesUpdate?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartLinesUpdate.cart),
          });
        }
      }
    },
    [fetch, onLineUpdate, numCartLines]
  );

  const noteUpdate = useCallback(
    async (note: CartNoteUpdateMutationVariables['note'], state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'noteUpdate'});

        onNoteUpdate?.();

        const {data, error} = await fetch<
          CartNoteUpdateMutationVariables,
          CartNoteUpdateMutation
        >({
          query: CartNoteUpdate,
          variables: {
            cartId: state.cart.id!,
            note: note,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartNoteUpdate?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartNoteUpdate.cart),
          });
        }
      }
    },
    [fetch, onNoteUpdate, numCartLines]
  );

  const buyerIdentityUpdate = useCallback(
    async (buyerIdentity: CartBuyerIdentityInput, state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'buyerIdentityUpdate'});

        onBuyerIdentityUpdate?.();

        const {data, error} = await fetch<
          CartBuyerIdentityUpdateMutationVariables,
          CartBuyerIdentityUpdateMutation
        >({
          query: CartBuyerIdentityUpdate,
          variables: {
            cartId: state.cart.id!,
            buyerIdentity: buyerIdentity,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartBuyerIdentityUpdate?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartBuyerIdentityUpdate.cart),
          });
        }
      }
    },
    [fetch, onBuyerIdentityUpdate, numCartLines]
  );

  const cartAttributesUpdate = useCallback(
    async (attributes: AttributeInput[], state: State) => {
      if (state.status === 'idle') {
        dispatch({type: 'cartAttributesUpdate'});

        onAttributesUpdate?.();

        const {data, error} = await fetch<
          CartAttributesUpdateMutationVariables,
          CartAttributesUpdateMutation
        >({
          query: CartAttributesUpdate,
          variables: {
            cartId: state.cart.id!,
            attributes: attributes,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartAttributesUpdate?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartAttributesUpdate.cart),
          });
        }
      }
    },
    [fetch, onAttributesUpdate, numCartLines]
  );

  const discountCodesUpdate = useCallback(
    async (
      discountCodes: CartDiscountCodesUpdateMutationVariables['discountCodes'],
      state: State
    ) => {
      if (state.status === 'idle') {
        dispatch({type: 'discountCodesUpdate'});

        onDiscountCodesUpdate?.();

        const {data, error} = await fetch<
          CartDiscountCodesUpdateMutationVariables,
          CartDiscountCodesUpdateMutation
        >({
          query: CartDiscountCodesUpdate,
          variables: {
            cartId: state.cart.id!,
            discountCodes: discountCodes,
            numCartLines,
          },
        });

        if (error) {
          dispatch({
            type: 'reject',
            error: error,
          });
        }

        if (data?.cartDiscountCodesUpdate?.cart) {
          dispatch({
            type: 'resolve',
            cart: cartFromGraphQL(data.cartDiscountCodesUpdate.cart),
          });
        }
      }
    },
    [fetch, onDiscountCodesUpdate, numCartLines]
  );

  const didFetchCart = useRef(false);

  useEffect(() => {
    if (
      localStorage.getItem(CART_ID_STORAGE_KEY) &&
      state.status === 'uninitialized' &&
      !didFetchCart.current
    ) {
      didFetchCart.current = true;
      cartFetch(localStorage.getItem(CART_ID_STORAGE_KEY)!);
    }
  }, [cartFetch, state]);

  const cartContextValue = useMemo(() => {
    return {
      ...('cart' in state
        ? state.cart
        : {
            lines: [],
            attributes: [],
            ...(cart ? cartFromGraphQL(cart) : {}),
          }),
      status: state.status,
      error: 'error' in state ? state.error : undefined,
      cartCreate,
      linesAdd(lines: CartLineInput[]) {
        addLineItem(lines, state);
      },
      linesRemove(lines: string[]) {
        removeLineItem(lines, state);
      },
      linesUpdate(lines: CartLineUpdateInput[]) {
        updateLineItem(lines, state);
      },
      noteUpdate(note: CartNoteUpdateMutationVariables['note']) {
        noteUpdate(note, state);
      },
      buyerIdentityUpdate(buyerIdentity: CartBuyerIdentityInput) {
        buyerIdentityUpdate(buyerIdentity, state);
      },
      cartAttributesUpdate(attributes: AttributeInput[]) {
        cartAttributesUpdate(attributes, state);
      },
      discountCodesUpdate(
        discountCodes: CartDiscountCodesUpdateMutationVariables['discountCodes']
      ) {
        discountCodesUpdate(discountCodes, state);
      },
    };
  }, [
    state,
    cart,
    cartCreate,
    addLineItem,
    removeLineItem,
    updateLineItem,
    noteUpdate,
    buyerIdentityUpdate,
    cartAttributesUpdate,
    discountCodesUpdate,
  ]);

  return (
    <CartContext.Provider value={cartContextValue}>
      {children}
    </CartContext.Provider>
  );
}

function cartFromGraphQL(cart: CartFragmentFragment): Cart {
  return {
    ...cart,
    lines: flattenConnection(cart.lines),
    note: cart.note ?? undefined,
  };
}