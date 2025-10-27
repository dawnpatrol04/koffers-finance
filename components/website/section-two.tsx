export function SectionTwo() {
  return (
    <section className="border border-border container dark:bg-[#121212] lg:pb-0 overflow-hidden mb-12 group">
      <div className="flex flex-col lg:space-x-12 lg:flex-row">
        <div className="lg:w-1/2 p-8 lg:p-12 bg-muted/50 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            [Financial Overview Screenshot]
          </div>
        </div>

        <div className="xl:mt-6 lg:max-w-[40%] md:ml-8 md:mb-8 flex flex-col justify-center p-8 md:pl-0 relative">
          <h3 className="font-medium text-xl md:text-2xl mb-4">
            Financial overview
          </h3>

          <p className="text-[#878787] mb-8 lg:mb-4 text-sm">
            Connect your bank accounts and credit cards. Track your expenses
            and income in real-time. Get insights into your spending habits
            and financial health.
          </p>

          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 13"
                fill="none"
                className="flex-none w-[1.125rem] h-[1lh]"
              >
                <path
                  fill="currentColor"
                  d="M6.55 13 .85 7.3l1.425-1.425L6.55 10.15 15.725.975 17.15 2.4 6.55 13Z"
                />
              </svg>
              <span className="text-primary">Real-time sync</span>
            </div>

            <div className="flex space-x-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 13"
                fill="none"
                className="flex-none w-[1.125rem] h-[1lh]"
              >
                <path
                  fill="currentColor"
                  d="M6.55 13 .85 7.3l1.425-1.425L6.55 10.15 15.725.975 17.15 2.4 6.55 13Z"
                />
              </svg>
              <span className="text-primary">Smart categorization</span>
            </div>

            <div className="flex space-x-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 13"
                fill="none"
                className="flex-none w-[1.125rem] h-[1lh]"
              >
                <path
                  fill="currentColor"
                  d="M6.55 13 .85 7.3l1.425-1.425L6.55 10.15 15.725.975 17.15 2.4 6.55 13Z"
                />
              </svg>
              <span className="text-primary">Budget tracking</span>
            </div>

            <div className="flex space-x-2 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 13"
                fill="none"
                className="flex-none w-[1.125rem] h-[1lh]"
              >
                <path
                  fill="currentColor"
                  d="M6.55 13 .85 7.3l1.425-1.425L6.55 10.15 15.725.975 17.15 2.4 6.55 13Z"
                />
              </svg>
              <span className="text-primary">
                AI-powered insights
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
