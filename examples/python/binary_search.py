def binary_search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        checkpoint("mid", mid, nums[mid])
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1

binary_search([1, 3, 5, 7, 9, 11], 7)
