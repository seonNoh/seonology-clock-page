import { useState, useEffect } from 'react';
import './TodoList.css';

const STORAGE_KEY = 'seonology-todos';

const getInitialTodos = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

function TodoList() {
  const [todos, setTodos] = useState(getInitialTodos);
  const [inputValue, setInputValue] = useState('');

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTodo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos([...todos, newTodo]);
    setInputValue('');
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed));
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="todo-list">
      <form className="todo-form" onSubmit={addTodo}>
        <input
          type="text"
          className="todo-input"
          placeholder="할 일을 입력하세요..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="todo-add-btn">
          +
        </button>
      </form>

      <div className="todo-items">
        {todos.length === 0 ? (
          <div className="todo-empty">
            <span>할 일이 없습니다</span>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <button
                className="todo-checkbox"
                onClick={() => toggleTodo(todo.id)}
              >
                {todo.completed ? '✓' : ''}
              </button>
              <span className="todo-text">{todo.text}</span>
              <button
                className="todo-delete"
                onClick={() => deleteTodo(todo.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {totalCount > 0 && (
        <div className="todo-footer">
          <span className="todo-count">
            {completedCount}/{totalCount} 완료
          </span>
          {completedCount > 0 && (
            <button className="todo-clear" onClick={clearCompleted}>
              완료 항목 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TodoList;
