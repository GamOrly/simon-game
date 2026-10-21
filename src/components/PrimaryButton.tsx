import type { ButtonHTMLAttributes } from 'react';

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn-primary${className ? ` ${className}` : ''}`} {...props} />
  );
}
