# XMTP Mini App Examples

This directory contains modular components that demonstrate various features of XMTP integration within a React application.

## Components

- **ConnectionInfo**: Displays connection status, including wallet type, address, and XMTP connection details.
- **WalletConnection**: Provides options to connect with different wallet types (EOA, Smart Contract, Ephemeral).
- **GroupManagement**: Handles joining and leaving XMTP groups, including status updates.
- **BackendInfo**: Shows data from the backend server about the group, including members and messages.
- **LogoutButton**: Implements a complete logout flow, clearing all local storage and cookies.

## Usage

You can use these components individually in your own application or together as shown in `ExamplePage.tsx`:

```tsx
import { ConnectionInfo, WalletConnection } from '@/examples';

function MyPage() {
  return (
    <div>
      <ConnectionInfo />
      <WalletConnection />
    </div>
  );
}
```

## Integration

These examples depend on the XMTP context provider from `@/context/xmtp-context`, which should be set up in your application wrapper.

## Complete Example

To see all components working together, import and use the `ExamplePage` component:

```tsx
import ExamplePage from '@/examples/ExamplePage';

export default function MyApp() {
  return (
    <ExamplePage />
  );
}
``` 