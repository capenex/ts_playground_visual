class Counter:
    def __init__(self, start):
        self.total = start
        self.history = []

    def add(self, n):
        self.total += n
        self.history.append(n)
        return self.total

def run_counter(start, times):
    c = Counter(start)
    for i in range(times):
        c.add(i + 1)
    return c.total

run_counter(1, 3)
