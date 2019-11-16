import {get_struct} from './text2struct'
import { clean } from './clean_text';
import * as vscode from 'vscode';


export class StructCommandManager {

    /* List of structure commands. Used to feed into the AST */
    struct_command_list: string[]
    /* List of variables declared by the user */
    variable_list: string[]
    /* current index within the struct_command_list - helpful for:
        - determining where to splice into the struct command list
        - for extendable commands */
    curr_index: number
    /* current command the user is saying. Stored in a list of string. e.g. ["declare", "integer", "hello"]*/
    curr_speech: string[]

    /* If the command is extendable. e.g. "declare integer hello", can be extended with "equals 5" */
    extendable: boolean

    constructor() {
        this.curr_index = 0
        this.struct_command_list = [""]
        this.curr_speech = [""]
        this.variable_list = [""]
        this.extendable = false
    }

    parse_speech(transcribed_word: string) {

        var cleaned_speech = clean(transcribed_word);

        this.curr_speech.push(cleaned_speech)

        /* Remove the "" blanks from the curr speech. */
        this.curr_speech = this.curr_speech.filter(function(value, index, arr){
            return value != "";
        });

        var struct_command = get_struct(this.curr_speech, this.variable_list, this.extendable);

        this.updateStructCommandList(struct_command)
    }

    /* Updating the struct command list */
    updateStructCommandList(struct_command: any[] | (boolean | string[])[]) {

        /* Check if go ahead - Basically, the latest input speech is confirmed to not be related to the
        previous extendable command. We can go ahead and increase curr_index and remove the previous 
        extentable command from the curr_speech. 
        curr_index should point at the chunk of speech that we have confirmed to not be related to prev
        command. */
        if (struct_command[2][2]) {
            this.curr_index += 1
            this.curr_speech.shift()
            this.struct_command_list.splice(this.curr_index, 0, this.curr_speech.join(" "))
            this.extendable = false;
        }


        /* Command is parseable, add to struct command! */
        if (struct_command[0][0] != "Not ready") {

            /* Block statement */
            if (struct_command[0].length > 1) {
                this.struct_command_list.splice(this.curr_index, 1, struct_command[0][0])
                this.curr_index += 1
                this.struct_command_list.push("") // Blank line for the curr_index to point at later.
                this.curr_index += 1
                this.struct_command_list.splice(this.curr_index, 0, struct_command[0][1])
                this.curr_index -= 1 // Make sure curr_index points at the blank line.

                this.curr_speech = [""]
            }
    
            /* Single line */
            else {

                /* Splice and delete previous unparseable speech / extendable command. */
                this.struct_command_list.splice(this.curr_index, 1, struct_command[0][0])

                /* If new_line is true, insert blank line "". Now curr_index points at blank line. */
                if (struct_command[2][0]) {
                    this.curr_index += 1
                    this.curr_speech = [""]
                    this.struct_command_list.splice(this.curr_index, 0, "")
                }

                this.extendable = struct_command[2][1]

                /* Combine the extendable message into 1 */
                if (this.extendable) {
                    this.curr_speech = [this.curr_speech.join(" ")]
                }
            }
        }
        /* Not ready to parse, add normal speech to struct_command_list */
        else {
            var speech = this.curr_speech.join(" ")
            this.struct_command_list.splice(this.curr_index, 1, speech)
            vscode.window.showInformationMessage(struct_command[0][1]);
            /* I'm not sure if extendable should be false here. But keep it here for now. */
            this.extendable = false
        }

        this.concatVariableList(struct_command[1]);
    }

    
    concatVariableList(var_list: any) {
        if (var_list.length > 0) {
            let i;
            for (i = 0; i < var_list.length; i++) {
                if (var_list[i].length > 0 && !this.variable_list.includes(var_list[i])) {
                    this.variable_list.push(var_list[i]);
                }
            }
        }
    }
}