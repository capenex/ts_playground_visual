function lcs(a: string, b: string): number {
  const n: number = a.length;
  const m: number = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dp.push(Array(m + 1).fill(0));
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}

lcs("ABCBDAB", "BDCABA")
