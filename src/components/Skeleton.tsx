import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

const variantClasses = {
  rectangle: 'rounded-lg',
  circle: '!rounded-full',
  text: 'rounded h-3.5 w-full'
};

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangle', width, height }) => (
  <div className={`skeleton ${variantClasses[variant]} ${className}`} style={{ width, height }} />
);

export default Skeleton;
