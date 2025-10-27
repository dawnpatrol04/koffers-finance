export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Total Balance</h2>
            <p className="text-2xl font-bold">$0.00</p>
          </div>

          <div className="p-6 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Income</h2>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
          </div>

          <div className="p-6 border border-border rounded-lg">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Expenses</h2>
            <p className="text-2xl font-bold text-red-600">$0.00</p>
          </div>
        </div>

        <div className="p-6 border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <p className="text-muted-foreground">No transactions yet. Connect your bank account to get started.</p>
        </div>
      </div>
    </div>
  );
}
