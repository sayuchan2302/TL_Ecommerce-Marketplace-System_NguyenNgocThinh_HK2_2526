import type { ComponentProps, Key } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import './ProductCardGrid.css';

export type ProductCardGridCardProps = ComponentProps<typeof ProductCard>;

interface ProductCardGridProps<T> {
  items: T[];
  getItemKey: (item: T) => Key;
  mapItemToCardProps: (item: T) => ProductCardGridCardProps;
  className?: string;
}

const ProductCardGrid = <T,>({
  items,
  getItemKey,
  mapItemToCardProps,
  className = '',
}: ProductCardGridProps<T>) => {
  const classes = ['product-card-grid', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {items.map((item) => (
        <div key={getItemKey(item)} className="product-card-grid__item">
          <ProductCard {...mapItemToCardProps(item)} />
        </div>
      ))}
    </div>
  );
};

export default ProductCardGrid;
