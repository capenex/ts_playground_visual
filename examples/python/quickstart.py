def bubble_sort(nums):
    a = nums[:]
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a

nums = [5, 2, 9, 1, 5, 6]
bubble_sort(nums)
