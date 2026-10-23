const nums: number[] = [8, 3, 5, 1, 9, 2, 7, 4];

function mergeSort(l: number, r: number): number[] {
  if (l >= r) {
    return nums;
  }
  const mid: number = (l + r) >> 1;
  mergeSort(l, mid);
  mergeSort(mid + 1, r);
  const tmp: number[] = [];
  let i: number = l;
  let j: number = mid + 1;
  while (i <= mid && j <= r) {
    if (nums[i] <= nums[j]) {
      tmp.push(nums[i]);
      i = i + 1;
    } else {
      tmp.push(nums[j]);
      j = j + 1;
    }
  }
  while (i <= mid) {
    tmp.push(nums[i]);
    i = i + 1;
  }
  while (j <= r) {
    tmp.push(nums[j]);
    j = j + 1;
  }
  for (let k = 0; k < tmp.length; k++) {
    nums[l + k] = tmp[k];
  }
  return nums;
}

mergeSort(0, 7)
