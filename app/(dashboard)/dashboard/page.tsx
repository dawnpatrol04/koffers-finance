export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Overview</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition">
          Connect Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
          <p className="text-3xl font-bold">$0.00</p>
          <p className="text-xs text-muted-foreground mt-2">No accounts connected</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">This Month</p>
          <p className="text-3xl font-bold">$0.00</p>
          <p className="text-xs text-muted-foreground mt-2">Income and expenses</p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">Savings</p>
          <p className="text-3xl font-bold">$0.00</p>
          <p className="text-xs text-muted-foreground mt-2">Monthly savings</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>No transactions yet</p>
          <p className="text-sm mt-2">Connect an account to see your transactions</p>
        </div>
      </div>
    </div>
  );
}
