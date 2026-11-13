interface BurgerMenuProps {
  open: boolean;
}

export function BurgerMenu({ open }: BurgerMenuProps) {
  return (
    <span className={`burger-icon ${open ? 'is-open' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
