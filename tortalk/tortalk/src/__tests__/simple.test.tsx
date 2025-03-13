import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// A simple component to test
const SimpleComponent = () => {
  return <div data-testid="simple-component">Hello, world!</div>;
};

describe('Simple Component', () => {
  test('renders without crashing', () => {
    render(<SimpleComponent />);
    expect(screen.getByTestId('simple-component')).toBeInTheDocument();
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });
}); 