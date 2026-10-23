function debugCrashDemo(nums: number[], limit: number): number {
  let acc = 0;
  const history: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    acc = acc + x;
    history.push(acc);
    checkpoint("检查累加值", i, x, acc);
    if (acc > limit) {
      throw new Error("运行时异常: 累加值 acc(" + acc + ") 超过安全阈值 " + limit);
    }
  }
  return acc;
}

debugCrashDemo([4, 7, 5, 9, 3], 18)
