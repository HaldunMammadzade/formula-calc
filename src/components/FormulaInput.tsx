import { useState, useRef, useEffect } from "react";
import { useFormulaStore } from "../store/formulaStore";
import { useAutocomplete } from "../hooks/useAutocomplete";

interface FormulaTag {
  id: string;
  name: string;
  value: number;
  category: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  value: number;
  category: string;
}

type FormulaItem = FormulaTag | string;

interface FormulaStoreState {
  formula: FormulaItem[];
}

const OPERATORS = ["+", "-", "*", "/", "^", "(", ")"];

const FormulaInput = () => {
  const { formula } = useFormulaStore() as { formula: FormulaItem[] };
  const [inputValue, setInputValue] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<number | string>(0);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    setResult(calculateTotal());
  }, [formula]);

  const updateFormula = (newFormula: FormulaItem[]) => {
    useFormulaStore.setState({ formula: newFormula });
  };
  
  const shouldFetchSuggestions = inputValue.trim() !== "" && /[a-zA-Z]/.test(inputValue);
  const { data: suggestions = [] } = useAutocomplete(shouldFetchSuggestions ? inputValue : "") as { 
    data: SuggestionItem[] 
  };
  
  const getFormattedFormula = () => {
    return formula.map(item => {
      return typeof item === "object" ? `{{${item.name}}}` : item;
    });
  };

  const calculateTotal = () => {
    if (!formula.length) return 0;
    
    try {
      let expression = '';
      
      formula.forEach(item => {
        if (typeof item === "object") {
          expression += `(${item.value})`;
        } else if (OPERATORS.includes(item)) {
          if (item === '*') {
            expression += '*'; 
          } else if (item === '/') {
            expression += '/'; 
          } else if (item === '^') {
            expression += '**';
          } else {
            expression += item; 
          }
        } else {
          expression += `(${Number(item)})`;
        }
      });
      
      expression = expression.replace(/\(\(([^)]+)\)\)/g, '($1)');
      
      console.log("Evaluating:", expression);
      return Function('"use strict"; return (' + expression + ')')();
    } catch (error) {
      console.error("Calculation error:", error);
      return "";
    }
  };

  const processExpression = (expr: string) => {
    if (/^[\d+\-*/^().]+$/.test(expr)) {
      try {
        const jsExpr = expr.replace(/\^/g, '**');
        Function('"use strict"; return (' + jsExpr + ')')();
        
        let tokens: string[] = [];
        let currentToken = '';
        
        for (let i = 0; i < expr.length; i++) {
          const char = expr[i];
          
          if (OPERATORS.includes(char)) {
            if (currentToken) {
              tokens.push(currentToken);
              currentToken = '';
            }
            tokens.push(char);
          } else {
            currentToken += char;
          }
        }
        
        if (currentToken) {
          tokens.push(currentToken);
        }
        
        tokens = tokens.map(token => {
          if (/^\d+(\.\d+)?$/.test(token)) {
            return String(Number(token)); 
          }
          return token;
        });
        
        const newFormula = [...formula];
        newFormula.splice(cursorPosition, 0, ...tokens);
        updateFormula(newFormula);
        setCursorPosition(cursorPosition + tokens.length);
      } catch (error) {
        console.error("Invalid expression:", expr, error);
      }
    }
  };

  const insertItemAtCursor = (item: FormulaItem) => {
    const newFormula = [...formula];
    newFormula.splice(cursorPosition, 0, item);
    updateFormula(newFormula);
    setCursorPosition(cursorPosition + 1);
    setInputValue("");
    setShowSuggestions(false);
    setEditingTagIndex(null);
  };

  const deleteItemAtCursor = () => {
    if (cursorPosition > 0) {
      const newFormula = [...formula];
      newFormula.splice(cursorPosition - 1, 1);
      updateFormula(newFormula);
      setCursorPosition(cursorPosition - 1);
      setEditingTagIndex(null);
    }
  };

  const replaceTag = (index: number, newTag: FormulaTag) => {
    const newFormula = [...formula];
    newFormula[index] = newTag;
    updateFormula(newFormula);
    setEditingTagIndex(null);
  };

  const handleTagClick = (index: number) => {
    setEditingTagIndex(index === editingTagIndex ? null : index);
    setCursorPosition(index + 1);
    setInputValue("");
    setShowSuggestions(false);
    
    if (inputRef.current) inputRef.current.focus();
  };

  const parseAndInsertInput = (inputText: string) => {
    const operatorWithNumberRegex = /^([+\-*/^])([\d.]+)$/;
    const match = inputText.match(operatorWithNumberRegex);
    
    if (match) {
      const [, operator, number] = match;
      insertItemAtCursor(operator);
      insertItemAtCursor(String(Number(number))); 
    } else if (/^\d+(\.\d+)?$/.test(inputText)) {
      insertItemAtCursor(String(Number(inputText)));
    } else if (OPERATORS.includes(inputText)) {
      insertItemAtCursor(inputText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" && cursorPosition > 0) {
      e.preventDefault();
      setCursorPosition(cursorPosition - 1);
      setEditingTagIndex(null);
    } else if (e.key === "ArrowRight" && cursorPosition < formula.length) {
      e.preventDefault();
      setCursorPosition(cursorPosition + 1);
      setEditingTagIndex(null);
    } else if (e.key === "Backspace" && inputValue === "") {
      e.preventDefault();
      deleteItemAtCursor();
    } else if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        const selectedItem = suggestions[selectedSuggestionIndex];
        
        if (editingTagIndex !== null && typeof formula[editingTagIndex] === "object") {
          replaceTag(editingTagIndex, {
            id: selectedItem.id,
            name: selectedItem.name,
            value: selectedItem.value,
            category: selectedItem.category
          });
        } else {
          insertItemAtCursor({
            id: selectedItem.id,
            name: selectedItem.name,
            value: selectedItem.value,
            category: selectedItem.category
          });
        }
      }
    } else if (e.key === "Enter" && inputValue.trim() !== "") {
      e.preventDefault();
      const value = inputValue.trim();
      
      if (/[\d+\-*/^()]{3,}/.test(value) && /[+\-*/^()]/.test(value)) {
        processExpression(value);
      } else {
        parseAndInsertInput(value);
      }
      
      setInputValue("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    setShowSuggestions(/[a-zA-Z]/.test(value));
    if (/[a-zA-Z]/.test(value)) setSelectedSuggestionIndex(-1);
  };

  const getTagColor = (category: string) => {
    const colorMap: {
      [key: string]: { bg: string; text: string; border: string }
    } = {
      'income': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      'expense': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      'saving': { bg: '#e0f2fe', text: '#0c4a6e', border: '#7dd3fc' },
      'investment': { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
      'default': { bg: '#e5edff', text: '#1e40af', border: '#bfdbfe' }
    };
    
    return colorMap[category] || colorMap.default;
  };

  const renderTagEditingDropdown = (index: number) => {
    if (index !== editingTagIndex || !suggestions || suggestions.length === 0) {
      return null;
    }

    const tagPosition = document.getElementById(`formula-item-${index}`)?.getBoundingClientRect();
    if (!tagPosition) return null;

    return (
      <ul
        style={{
          position: "absolute",
          top: `${tagPosition.bottom + window.scrollY + 8}px`,
          left: `${tagPosition.left + window.scrollX}px`,
          width: "280px",
          background: "white",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "4px 0",
          listStyle: "none",
          maxHeight: "240px",
          overflowY: "auto",
          zIndex: 30,
          boxShadow: "0px 10px 15px rgba(0,0,0,0.1)",
        }}
      >
        {suggestions.map((suggestion, idx) => {
          const colors = getTagColor(suggestion.category);
          
          return (
            <li
              key={suggestion.id}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                background: selectedSuggestionIndex === idx ? "#f9fafb" : "transparent",
                borderLeft: selectedSuggestionIndex === idx ? `4px solid ${colors.border}` : "4px solid transparent",
                transition: "all 0.1s ease"
              }}
              onClick={() => {
                replaceTag(index, {
                  id: suggestion.id,
                  name: suggestion.name,
                  value: suggestion.value,
                  category: suggestion.category
                });
              }}
              onMouseEnter={() => setSelectedSuggestionIndex(idx)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "500", fontSize: "15px" }}>{suggestion.name}</span>
                <span style={{ 
                  color: colors.text, 
                  fontSize: "12px",
                  padding: "2px 6px",
                  background: colors.bg,
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`
                }}>{suggestion.category}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Value: {suggestion.value}</div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFormula = () => {
    const formattedItems = getFormattedFormula();
    
    return (
      <div style={{ 
        border: "1px solid #d1d5db", 
        borderRadius: "8px", 
        padding: "12px", 
        minHeight: "50px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px",
        background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1) inset",
        transition: "all 0.2s ease"
      }}>
        {formattedItems.map((item, index) => {
          const isTag = item.startsWith("{{") && item.endsWith("}}");
          const isAtCursor = index === cursorPosition - 1;
          const isEditing = index === editingTagIndex;
          
          const category = isTag && typeof formula[index] === "object" 
            ? (formula[index] as FormulaTag).category 
            : 'default';
          
          const colors = isTag ? getTagColor(category) : { bg: 'transparent', text: '#333', border: '#ddd' };
          const isOperator = OPERATORS.includes(item);
          
          return (
            <span 
              id={`formula-item-${index}`}
              key={`formula-item-${index}`}
              style={{
                color: isTag ? colors.text : isOperator ? "#4b5563" : "#333",
                padding: isTag ? "4px 8px" : isOperator ? "2px 8px" : "2px 4px",
                
                margin: "2px",
                fontSize: "15px",
                fontWeight: isTag || isOperator ? "500" : "normal",
                transition: "all 0.15s ease",
                boxShadow: isEditing ? "0 0 0 2px rgba(79, 70, 229, 0.3)" :
                           isAtCursor ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
                cursor: isTag ? "pointer" : "default"
              }}
              onClick={() => isTag ? handleTagClick(index) : null}
            >
              {isTag ? (
                <>
                  {item.slice(2, -2)}
                  <span style={{ 
                    marginLeft: "4px", 
                    opacity: "0.7", 
                    fontSize: "12px" 
                  }}>
                    ({(formula[index] as FormulaTag).value})
                  </span>
                </>
              ) : item}
            </span>
          );
        })}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          style={{
            border: "none",
            outline: "none",
            flex: "1",
            minWidth: "80px",
            fontSize: "15px",
            padding: "6px 4px",
            background: "transparent"
          }}
          placeholder="Type formula, number, operator, or letters for tags..."
          autoFocus
        />
        
        {cursorPosition === formula.length && !inputValue && (
          <span style={{ 
            height: "20px", 
            width: "2px", 
            backgroundColor: "#6366f1", 
            animation: "blink 1s infinite"
          }}></span>
        )}

        {formula.map((_, index) => renderTagEditingDropdown(index))}
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "auto", 
      padding: "24px", 
      background: "#f9fafb", 
      boxShadow: "0px 8px 20px rgba(0,0,0,0.08)", 
      borderRadius: "12px", 
      position: "relative",
      fontFamily: "system-ui, -apple-system, sans-serif" 
    }}>
      <h3 style={{ 
        fontSize: "18px", 
        fontWeight: "600", 
        color: "#111827", 
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 7H20M4 17H20M7 12H17" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Formula Calculator
      </h3>
      
      <div style={{ position: "relative", marginBottom: "20px" }}>
        {renderFormula()}
        
        {showSuggestions && suggestions.length > 0 && editingTagIndex === null && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "280px",
              background: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              marginTop: "6px",
              padding: "4px 0",
              listStyle: "none",
              maxHeight: "240px",
              overflowY: "auto",
              zIndex: 20,
              boxShadow: "0px 10px 15px rgba(0,0,0,0.1)",
            }}
          >
            {suggestions.map((suggestion, index) => {
              const colors = getTagColor(suggestion.category);
              
              return (
                <li
                  key={suggestion.id}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    background: selectedSuggestionIndex === index ? "#f9fafb" : "transparent",
                    borderLeft: selectedSuggestionIndex === index ? `4px solid ${colors.border}` : "4px solid transparent",
                    transition: "all 0.1s ease"
                  }}
                  onClick={() => {
                    insertItemAtCursor({
                      id: suggestion.id,
                      name: suggestion.name,
                      value: suggestion.value,
                      category: suggestion.category
                    });
                  }}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "500", fontSize: "15px" }}>{suggestion.name}</span>
                    <span style={{ 
                      color: colors.text, 
                      fontSize: "12px",
                      padding: "2px 6px",
                      background: colors.bg,
                      borderRadius: "4px",
                      border: `1px solid ${colors.border}`
                    }}>{suggestion.category}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Value: {suggestion.value}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "16px 20px",
        borderRadius: "8px",
        boxShadow: "0px 2px 8px rgba(0,0,0,0.05)"
      }}>
        <div style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          color: "#111827",
          display: "flex",
          alignItems: "center",
          gap: "8px" 
        }}>
          <span style={{ fontSize: "15px", color: "#6b7280" }}>Result:</span>
          <span style={{ color: "#4f46e5" }}>{result}</span>
        </div>
        
        {formula.length > 0 && (
          <button 
            onClick={() => {
              updateFormula([]);
              setCursorPosition(0);
              setInputValue("");
              setEditingTagIndex(null);
            }}
            style={{ 
              background: "#fee2e2", 
              border: "none", 
              borderRadius: "6px",
              color: "#b91c1c", 
              cursor: "pointer",
              padding: "6px 12px",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Clear All
          </button>
        )}
      </div>
      
      <div style={{ 
        marginTop: "20px", 
        padding: "12px", 
        backgroundColor: "#f3f4f6", 
        borderRadius: "6px",
        fontSize: "14px",
        color: "#6b7280"
      }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>Tips:</p>
        <ul style={{ margin: "0", paddingLeft: "20px" }}>
          <li>Type a complete formula (e.g. 5+10-4) and press Enter</li>
          <li>Type letters to see tag suggestions</li>
          <li>Use arrow keys to navigate between elements</li>
          <li>Use Backspace to delete elements</li>
          <li>Click on any tag to edit it</li>
        </ul>
      </div>
    </div>
  );
};

export default FormulaInput;