import type { ComponentProps } from 'react';

export function PrimaryButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button type="button" className={`btn-primary${className ? ` ${className}` : ''}`} {...props} />
  );
}
