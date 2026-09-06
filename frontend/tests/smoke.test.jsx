import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Frontend test setup smoke test', () => {
  it('should run a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a React component with testing-library', () => {
    function Hello() {
      return <h1>Hello, JobPly!</h1>;
    }

    render(<Hello />);
    expect(screen.getByText('Hello, JobPly!')).toBeInTheDocument();
  });
});
