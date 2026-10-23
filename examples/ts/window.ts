function minSubArrayLen(target: number, nums: number[]): number {
  let l = 0;
  let sum = 0;
  let best = 999;
  for (let r = 0; r < nums.length; r++) {
    sum = sum + nums[r];
    while (sum >= target) {
      const len = r - l + 1;
      if (len < best) {
        best = len;
      }
      sum = sum - nums[l];
      l = l + 1;
    }
  }
  return best === 999 ? 0 : best;
}

minSubArrayLen(7, [2,3,1,2,4,3])
