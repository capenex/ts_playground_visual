class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None

def tour():
    arr = [3, 1, 4, 1, 5, 9]
    stack = [1, 2, 3]
    queue = [4, 5, 6]
    heap = [1, 3, 6, 5, 9]
    parent = [0, 0, 1, 1]
    mapping = {"a": 1, "b": 2}
    seen = {1, 2, 3}
    grid = [[1, 2], [3, 4]]
    text = "hello"
    tree = TreeNode(2)
    tree.left = TreeNode(1)
    tree.right = TreeNode(3)
    head = ListNode(1)
    head.next = ListNode(2)
    graph = {
        "nodes": [{"id": 0, "label": "A"}, {"id": 1, "label": "B"}, {"id": 2, "label": "C"}],
        "edges": [[0, 1], [1, 2], [0, 2]]
    }
    return arr

tour()
