/* eslint-disable no-unexpected-multiline */
/* eslint-disable no-unused-expressions */
{
    // Constants
    LLM_API_URL: '<PLACEHOLDER>',
    LLM_MODEL: '<PLACEHOLDER>',
    LLM_API_KEY: '<PLACEHOLDER>',  // Will be replaced at runtime
    
    // Store failed suggestions per root+description combination
    _failedSuggestions: {},

    // Store successful suggestions per root+description combination
    _successfulSuggestions: {},

    // Store invalid suggestions (syntactically incorrect) per root+description combination
    _invalidSuggestions: {},

    _cleanup(root) {
        console.log("Filtering non-relevant elements");
        var ret = this._filterNonRelevantElements(root);
        console.log("Removing comments");
        ret = this._removeComments(ret);
        console.log("Removing non-important attributes");
        ret = this._removeNonImportantAttributes(ret);
        return ret;
    },

    // Helper function to filter out non-relevant elements from the root
    _filterNonRelevantElements(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove <script>, <style>, and <noscript> elements in the clone
        const unwantedTags = ['script', 'style', 'noscript', 'link', 'meta', 'iframe', 'object', 'embed'];

        unwantedTags.forEach(tag => {
            const elements = clonedRoot.querySelectorAll(tag);
            elements.forEach(element => element.remove());
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to remove comments from the root
    _removeComments(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove comments from the clone
        const comments = clonedRoot.querySelectorAll('*');
        comments.forEach(element => {
            if (element.nodeType === Node.COMMENT_NODE) {
                element.remove();
            }
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to non important attributes
    _removeNonImportantAttributes(root) {
        // Clone the root element to preserve the original
        const clonedRoot = root.cloneNode(true);
        console.log('Original length', root.getHTML().length);

        // Remove non important attributes from the clone
        const importantAttributes = [
                'id',
                'class',
                'name',
                'data-*',
                'role',
                'type',
                'aria-*'
              
        ];

        // Remove all attributes except the important ones
        const elements = clonedRoot.querySelectorAll('*');
        elements.forEach(element => {
            const attributes = Array.from(element.attributes);
            attributes.forEach(attr => {
                if (!importantAttributes.some(ia => new RegExp(ia).test(attr.name))) {
                    element.removeAttribute(attr.name);
                }
            });
        });

        console.log('Parsed length', clonedRoot.getHTML().length);
        return clonedRoot;
    },

    // Helper function to get a unique key for root+description combination
    _getKey(content, description) {
        return `${content}:::${description}`;
    },

    // Helper function to record a failed suggestion
    _recordFailedSuggestion(content, description, selector) {
        const key = this._getKey(content, description);
        if (!this._failedSuggestions[key]) {
            this._failedSuggestions[key] = new Set();
        }
        this._failedSuggestions[key].add(selector);
    },

    // Helper function to record a successful suggestion
    _recordSuccessfulSuggestion(content, description, selector) {
        const key = this._getKey(content, description);
        if (!this._successfulSuggestions[key]) {
            this._successfulSuggestions[key] = new Set();
        }
        this._successfulSuggestions[key].add(selector);
    },

    // Helper function to record an invalid suggestion
    _recordInvalidSuggestion(content, description, selector) {
        const key = this._getKey(content, description);
        if (!this._invalidSuggestions[key]) {
            this._invalidSuggestions[key] = new Set();
        }
        this._invalidSuggestions[key].add(selector);
    },

    // Helper function to get failed suggestions
    _getFailedSuggestions(content, description) {
        const key = this._getKey(content, description);
        return Array.from(this._failedSuggestions[key] || []);
    },

    _getSuccessfulSuggestions(content, description) {
        const key = this._getKey(content, description);
        return Array.from(this._successfulSuggestions[key] || []);
    },

    // Helper function to get invalid suggestions
    _getInvalidSuggestions(content, description) {
        const key = this._getKey(content, description);
        return Array.from(this._invalidSuggestions[key] || []);
    },

    // Helper function to generate messages for the LLM
    _getMessages(description, content) {
        const failedSuggestions = this._getFailedSuggestions(content, description);
        const invalidSuggestions = this._getInvalidSuggestions(content, description);
        
        const messages = [{
            role: 'user',
            content: `
            You will be given a description of an element and an HTML snippet. Your job
            is to locate the element in the HTML snippet and generate a CSS selector for it.

            <INSTRUCTIONS>
            If the element has a unique attribute, return it. This could be:
                * id. For example: '#username-input'
                * data-* attribute. For example: '[data-qa="username-input"]'
                * aria-* attribute. For example: '[aria-label="Username Input"]'
                * role attribute. For example: '[role="textbox"]'
                * placeholder attribute. For example: 'input[placeholder="Enter your username"]'
                * name attribute. For example: 'input[name="username"]'
                * class attribute. For example: '.username-input'
            
            If the element contains a unique text, return it. For example: 'button:contains("Submit")'

            If the element does not contain any unique attributes, use a unique parent-child relationship to generate a selector
            For example:
                * #main-content form input[name="username"]
                * .product-list li:nth-of-type(1)
                * [role="main"] section h1:nth-of-type(1)
            
            If the element depends on a position, use nth-child or nth-of-type to make the selector more specific.
            For example:
                * .product-list li:nth-of-type(1)
                * .product-list:nth-child(4)

            If you cannot generate a selector, output 'NULL'.

            </INSTRUCTIONS>

            <OUTPUT>
            You should output the selector or 'NULL' if no selector is found.
            Do not include any additional text, comments or instructions in the output.
            Do not quote your response with backticks or any other characters.

            Just output the selector string or 'NULL'.
            </OUTPUT>
            
            <INPUT>
            Description: ${description}
            
            Page content:
            <PAGE>
            ${content}
            </PAGE>

            </INPUT>`
        }];

        // Add invalid suggestions first as they represent syntax errors
        if (invalidSuggestions.length > 0) {
            messages.push({
                role: 'assistant',
                content: invalidSuggestions[0]
            });
            messages.push({
                role: 'user',
                content: 'This selector was not valid. Try a different one.'
            });
            
            // Add remaining invalid suggestions as alternating assistant/user messages
            for (let i = 1; i < invalidSuggestions.length; i++) {
                messages.push({
                    role: 'assistant',
                    content: invalidSuggestions[i]
                });
                messages.push({
                    role: 'user',
                    content: 'This selector was also not valid. Try a different one.'
                });
            }
            console.log('Invalid suggestions:', invalidSuggestions);
        }

        // Add failed suggestions after invalid ones
        if (failedSuggestions.length > 0) {
            messages.push({
                role: 'assistant',
                content: failedSuggestions[0]
            });
            messages.push({
                role: 'user',
                content: 'That selector did not work. Please try a different approach.'
            });
            
            // Add remaining failed suggestions as alternating assistant/user messages
            for (let i = 1; i < failedSuggestions.length; i++) {
                messages.push({
                    role: 'assistant',
                    content: failedSuggestions[i]
                });
                messages.push({
                    role: 'user',
                    content: 'That selector also did not work. Please try a different approach.'
                });
            }
            console.log('Failed suggestions:', failedSuggestions);
        }

        // Add the final assistant message
        messages.push({
            role: 'assistant',
            content: 'The generated selector is:'
        });

        return messages;
    },

    // Helper function to make sync HTTP request to LLM
    _llm(messages) {
        // Check if we have any successful suggestions first
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.LLM_API_URL, false);  // false makes it synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${this.LLM_API_KEY}`);
        
        const data = {
            model: this.LLM_MODEL,
            max_tokens: 50,
            messages,
            stream: false
        };
        
        try {
            xhr.send(JSON.stringify(data));
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                const llm_selector = response.choices[0].message.content.trim();
                if (!llm_selector || llm_selector === 'NULL') {
                    console.error('No selector generated:', response);
                    return null;
                }
                console.log('Generated selector:', llm_selector);
                return llm_selector;
            } else {
                console.error('API request failed:', xhr.status, xhr.responseText);
                return null;
            }
        } catch (e) {
            console.error('Error making API request:', e);
            return null;
        }
    },

    // Returns the first element matching given selector in the root's subtree.
    query(root, selector) {
        console.log('%c AI Selector: Starting query', 'background: #222; color: #bada55');
        console.log('Root:', root);
        console.log('Selector:', selector);
                
        try {       
            // Get the root content instead of entire DOM
            const elem = root.documentElement ? root.documentElement.querySelector('body') : root;
            const content = this._cleanup(elem).getHTML();

            // Check if we have any successful suggestions first
            const successfulSuggestions = this._getSuccessfulSuggestions(content, selector);
            if (successfulSuggestions.length > 0) {
                console.log('Using cached successful selector:', successfulSuggestions[0]);
                return successfulSuggestions[0];
            }
            
            // Get selectors from LLM
            const messages = this._getMessages(selector, content);
            const llm_selector = this._llm(messages);

            if (!llm_selector || llm_selector === 'NULL') {
                console.error('No selector generated');
                return null;
            }
            
            try {
                console.log('Trying selector:', llm_selector);
                const element = root.querySelector(llm_selector);
                if (element) {
                    console.log('%c Found element!', 'background: green; color: white', {
                        selector: llm_selector,
                        element: element
                    });
                    this._recordSuccessfulSuggestion(content, selector, llm_selector);
                    return element;
                }
                console.log('No element found with selector:', llm_selector);
                // Record the failed suggestion
                this._recordFailedSuggestion(content, selector, llm_selector);
                return null;
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                // Record the invalid suggestion since it caused an error
                this._recordInvalidSuggestion(content, selector, llm_selector);
                return null;
            }
        } catch (e) {
            console.error('Error in query:', e);
            return null;
        }
    },

    // Returns all elements matching given selector in the root's subtree.
    queryAll(root, selector) {
        console.log('%c AI Selector: Starting queryAll', 'background: #222; color: #bada55');
        console.log('Root:', root);
        console.log('Selector:', selector);            
                
        try {            
            // Get the root content instead of entire DOM
            const elem = root.documentElement ? root.documentElement.querySelector('body') : root;
            const content = this._cleanup(elem).getHTML();

            // Check if we have any successful suggestions first
            const successfulSuggestions = this._getSuccessfulSuggestions(content, selector);
            if (successfulSuggestions.length > 0) {
                console.log('Using cached successful selector:', successfulSuggestions[0]);
                this._recordSuccessfulSuggestion(content, selector, successfulSuggestions[0]);
                return successfulSuggestions[0];
            }
            
            // Get selectors from LLM
            const messages = this._getMessages(selector, content);
            const llm_selector = this._llm(messages);
            
            const elements = new Set();
            try {
                console.log('Trying selector:', llm_selector);
                const found = root.querySelectorAll(llm_selector);
                if (found.length > 0) {
                    console.log('%c Found elements!', 'background: green; color: white', {
                        selector: llm_selector,
                        count: found.length
                    });
                    found.forEach(el => elements.add(el));
                } else {
                    console.log('No elements found with selector:', llm_selector);
                    // Record the failed suggestion
                    this._recordFailedSuggestion(content, selector, llm_selector);
                }
                return Array.from(elements);
            } catch (e) {
                console.error('Error with selector:', llm_selector, e);
                // Record the invalid suggestion since it caused an error
                this._recordInvalidSuggestion(content, selector, llm_selector);
                return [];
            }
        } catch (e) {
            console.error('Error in queryAll:', e);
            return [];
        }
    }
}
